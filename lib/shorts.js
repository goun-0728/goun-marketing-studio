// 숏폼 자동 편집 엔진 — 전부 브라우저에서 처리 (서버로 영상 업로드 없음)
// 1) 클립 분석(길이·오디오) 2) 무음 구간 자동 컷 3) 타임라인 구성
// 4) 오디오 믹싱(원본+BGM) 5) 9:16 캔버스에 자막/타이틀/CTA 합성 → MediaRecorder 녹화

import { drawContain, drawCover, drawText, font, measureLines, roundRect, wrapLines } from "./draw";

export const OW = 1080;
export const OH = 1920;
const SR = 48000;

// ---------- 1. 클립 분석 ----------
export async function analyzeFile(file, audioCtx) {
  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");
  if (isImage) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    return { id: crypto.randomUUID(), name: file.name, type: "image", url, img, duration: 0, audio: null, thumb: url };
  }

  const v = document.createElement("video");
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  await new Promise((res, rej) => {
    v.onloadedmetadata = res;
    v.onerror = () => rej(new Error(`${file.name}: 이 브라우저에서 열 수 없는 영상 형식이에요`));
  });
  // 썸네일
  let thumb = "";
  try {
    v.currentTime = Math.min(0.5, v.duration / 2);
    await new Promise((r) => (v.onseeked = r));
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 160;
    drawCover(c.getContext("2d"), v, 0, 0, 120, 160);
    thumb = c.toDataURL("image/jpeg", 0.7);
  } catch {}

  let audio = null;
  try {
    const buf = await file.arrayBuffer();
    audio = await audioCtx.decodeAudioData(buf);
  } catch {
    audio = null; // 소리 없는 영상
  }
  return { id: crypto.randomUUID(), name: file.name, type: "video", url, duration: v.duration, audio, thumb, w: v.videoWidth, h: v.videoHeight };
}

// ---------- 2. 무음 구간 감지 ----------
// 말소리가 있는 구간만 [start,end] 목록으로 반환. 판단 불가(전체가 비슷한 소음 등)면 null
export function detectSpeech(buffer, { sensitivity = 0.5, minGap = 0.45, pad = 0.15, minLen = 0.3 } = {}) {
  if (!buffer) return null;
  const win = Math.floor(buffer.sampleRate * 0.02); // 20ms
  const chs = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chs.push(buffer.getChannelData(c));
  const n = Math.floor(buffer.length / win);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const ch of chs) for (let j = i * win; j < (i + 1) * win; j++) sum += ch[j] * ch[j];
    const rms = Math.sqrt(sum / (win * chs.length));
    db[i] = 20 * Math.log10(rms + 1e-9);
  }
  const sorted = Array.from(db).sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.1)] ?? -90;
  const peak = sorted[Math.floor(n * 0.95)] ?? -90;
  if (peak < -50 || peak - floor < 12) return null; // 대사가 없는 영상 → 자르지 않음

  // 민감도 0(덜 자름) ~ 1(많이 자름)
  const thr = floor + (peak - floor) * (0.15 + sensitivity * 0.3);
  const segs = [];
  let s = -1;
  for (let i = 0; i < n; i++) {
    const on = db[i] > thr;
    if (on && s < 0) s = i;
    if (!on && s >= 0) {
      segs.push([s, i]);
      s = -1;
    }
  }
  if (s >= 0) segs.push([s, n]);
  const t = (i) => (i * win) / buffer.sampleRate;
  let out = segs.map(([a, b]) => [Math.max(0, t(a) - pad), Math.min(buffer.duration, t(b) + pad)]);
  // 짧은 무음은 합치기
  const merged = [];
  for (const seg of out) {
    const last = merged[merged.length - 1];
    if (last && seg[0] - last[1] < minGap) last[1] = Math.max(last[1], seg[1]);
    else merged.push([...seg]);
  }
  out = merged.filter(([a, b]) => b - a >= minLen);
  return out.length ? out : null;
}

// ---------- 3. 타임라인 ----------
// item: {clip, start, end, dur, at}
export function buildTimeline(clips, opts) {
  const items = [];
  let removed = 0;
  for (const clip of clips) {
    if (clip.type === "image") {
      items.push({ clip, start: 0, end: opts.photoDur, dur: opts.photoDur });
      continue;
    }
    let ranges = [[clip.trimStart || 0, clip.trimEnd || clip.duration]];
    if (opts.autoCut && clip.audio) {
      const sp = detectSpeech(clip.audio, { sensitivity: opts.cutStrength });
      if (sp) {
        const [a, b] = ranges[0];
        const cut = sp.map(([s, e]) => [Math.max(s, a), Math.min(e, b)]).filter(([s, e]) => e - s > 0.2);
        if (cut.length) {
          removed += b - a - cut.reduce((x, [s, e]) => x + e - s, 0);
          ranges = cut;
        }
      }
    }
    for (const [s, e] of ranges) items.push({ clip, start: s, end: e, dur: e - s });
  }
  // 최대 길이 제한
  let at = 0;
  const out = [];
  for (const it of items) {
    if (opts.maxDur && at >= opts.maxDur) break;
    const dur = opts.maxDur ? Math.min(it.dur, opts.maxDur - at) : it.dur;
    out.push({ ...it, end: it.start + dur, dur, at });
    at += dur;
  }
  return { items: out, total: at, removed };
}

// ---------- 4. 오디오 ----------
// 원본 대사 + BGM 믹스. voiceOnly=true면 음성인식용으로 원본만
export async function renderAudio(timeline, { keepOriginal = true, bgm = null, bgmVol = 0.25, voiceOnly = false }) {
  const total = Math.max(timeline.total, 0.5);
  const ctx = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
  if (keepOriginal || voiceOnly) {
    for (const it of timeline.items) {
      const buf = it.clip.audio;
      if (!buf || it.clip.type !== "video") continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      // 컷 경계 '틱' 소리 방지용 짧은 페이드
      const f = Math.min(0.02, it.dur / 4);
      g.gain.setValueAtTime(0, it.at);
      g.gain.linearRampToValueAtTime(1, it.at + f);
      g.gain.setValueAtTime(1, it.at + it.dur - f);
      g.gain.linearRampToValueAtTime(0, it.at + it.dur);
      src.connect(g).connect(ctx.destination);
      src.start(it.at, it.start, it.dur);
    }
  }
  if (bgm && !voiceOnly) {
    const src = ctx.createBufferSource();
    src.buffer = bgm;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(bgmVol, 0.5);
    g.gain.setValueAtTime(bgmVol, Math.max(0.5, total - 1.2));
    g.gain.linearRampToValueAtTime(0, total);
    src.connect(g).connect(ctx.destination);
    src.start(0);
  }
  return ctx.startRendering();
}

// 음성인식 업로드용: 16kHz 모노 16bit WAV (1분 ≈ 1.9MB)
export async function toWav16k(buffer) {
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(buffer.duration * rate), rate);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  const mono = (await off.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + mono.length * 2));
  const w = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF");
  out.setUint32(4, 36 + mono.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  w(36, "data");
  out.setUint32(40, mono.length * 2, true);
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([out], { type: "audio/wav" });
}

// ---------- 자막 ----------
// 음성인식 구간을 화면용 짧은 자막(maxChars 이하)으로 쪼개고 시간 비례 분배
export function splitCaptions(segments, maxChars = 16) {
  const out = [];
  for (const s of segments) {
    const words = s.text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars && cur) {
        chunks.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    if (cur) chunks.push(cur);
    const totalLen = chunks.reduce((a, c) => a + c.length, 0) || 1;
    let t = s.start;
    for (const c of chunks) {
      const d = ((s.end - s.start) * c.length) / totalLen;
      out.push({ start: +t.toFixed(2), end: +(t + d).toFixed(2), text: c });
      t += d;
    }
  }
  return out;
}

// AI가 쓴 자막 줄을 영상 길이에 고르게 배치 (마지막 CTA 구간은 비움)
export function spreadLines(lines, total, ctaDur) {
  const usable = Math.max(1, total - ctaDur);
  const d = usable / Math.max(1, lines.length);
  return lines.map((text, i) => ({ start: +(i * d).toFixed(2), end: +((i + 1) * d).toFixed(2), text }));
}

// ---------- 5. 렌더링 ----------
function pickMime() {
  const list = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
}

function drawFrame(ctx, media, it, localT, t, total, o) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OW, OH);
  if (media) {
    const isImg = it.clip.type === "image";
    const zoom = isImg ? 1 + 0.08 * Math.min(1, localT / Math.max(it.dur, 0.1)) : 1;
    if (o.fit === "cover") {
      drawCover(ctx, media, 0, 0, OW, OH, zoom);
    } else {
      // 블러 배경 + 원본 전체
      ctx.save();
      ctx.filter = "blur(40px) brightness(0.55)";
      drawCover(ctx, media, -60, -60, OW + 120, OH + 120);
      ctx.restore();
      drawContain(ctx, media, 0, 0, OW, OH, zoom);
    }
  }

  // 상단 타이틀 (쇼츠 스타일 고정 제목)
  if (o.title) {
    ctx.font = font(900, 78);
    const lines = Math.min(measureLines(ctx, o.title, OW - 140), 2);
    const bandH = 120 + lines * 96;
    if (o.titleBand) {
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(0, 0, OW, bandH + 60);
    }
    ctx.fillStyle = o.titleColor || "#ffe14d";
    drawText(ctx, o.title, OW / 2, 110, OW - 140, 96, { align: "center", stroke: o.titleBand ? 0 : 12, maxLines: 2 });
  }

  // 하단 자막
  const cap = o.captions.find((c) => t >= c.start && t < c.end);
  const inCta = o.cta && t >= total - o.ctaDur;
  if (cap && !inCta) {
    ctx.font = font(850, o.capSize);
    const maxW = OW - 120;
    const lines = wrapLines(ctx, cap.text, maxW).slice(0, 2);
    const lh = o.capSize * 1.28;
    const y = OH * o.capY - (lines.length * lh) / 2;
    lines.forEach((l, i) => {
      const ly = y + i * lh;
      if (o.capStyle === "box") {
        const tw = ctx.measureText(l).width + 48;
        ctx.fillStyle = o.capBoxColor;
        roundRect(ctx, (OW - tw) / 2, ly - 10, tw, lh + 4, 14);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(l, OW / 2, ly);
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.lineJoin = "round";
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#000";
        ctx.strokeText(l, OW / 2, ly);
        ctx.fillStyle = "#fff";
        ctx.fillText(l, OW / 2, ly);
      }
    });
  }

  // 마지막 CTA
  if (inCta) {
    const p = Math.min(1, (t - (total - o.ctaDur)) / 0.35);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * p})`;
    ctx.fillRect(0, 0, OW, OH);
    ctx.font = font(900, 76);
    const lines = wrapLines(ctx, o.cta, OW - 240).slice(0, 2);
    const lh = 96;
    const bh = lines.length * lh + 80;
    const bw = Math.min(OW - 120, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 120);
    const by = OH * 0.62 - bh / 2 + (1 - p) * 40;
    ctx.globalAlpha = p;
    ctx.fillStyle = o.accent;
    roundRect(ctx, (OW - bw) / 2, by, bw, bh, 36);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, OW / 2, by + 40 + i * lh));
    ctx.globalAlpha = 1;
  }

  // 워터마크
  if (o.brand) {
    ctx.font = font(700, 34);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(o.brand, OW - 50, OH - 60);
  }
}

// 미리보기용 한 장면 그리기
export function drawPreview(canvas, timeline, t, o) {
  canvas.width = OW;
  canvas.height = OH;
  const ctx = canvas.getContext("2d");
  const it = timeline.items.find((x) => t >= x.at && t < x.at + x.dur) || timeline.items[0];
  const media = it?.clip.type === "image" ? it.clip.img : o.previewVideo?.(it) || null;
  drawFrame(ctx, media, it || { clip: { type: "none" }, dur: 1 }, it ? t - it.at : 0, t, timeline.total, o);
}

function makeVideo(url, host) {
  const v = document.createElement("video");
  v.src = url;
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  host.appendChild(v);
  return v;
}

function seekTo(v, time) {
  return new Promise((res) => {
    if (Math.abs(v.currentTime - time) < 0.01 && v.readyState >= 2) return res();
    const done = () => {
      v.removeEventListener("seeked", done);
      res();
    };
    v.addEventListener("seeked", done);
    v.currentTime = time;
    setTimeout(done, 3000);
  });
}

/**
 * 실시간 녹화 (영상 길이만큼 걸림). 탭을 백그라운드로 보내면 멈출 수 있음.
 * 반환: {blob, mime}
 */
export async function recordShort({ canvas, timeline, audioBuffer, o, onProgress, signal }) {
  canvas.width = OW;
  canvas.height = OH;
  const ctx = canvas.getContext("2d");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none";
  document.body.appendChild(host);

  const items = timeline.items;
  const els = items.map((it) => (it.clip.type === "video" ? makeVideo(it.clip.url, host) : null));
  const prepared = new Set();
  const prep = (i) => {
    if (i >= items.length || !els[i] || prepared.has(i)) return;
    prepared.add(i);
    return seekTo(els[i], items[i].start);
  };
  await prep(0);
  prep(1);

  const ac = new AudioContext({ sampleRate: SR });
  const dest = ac.createMediaStreamDestination();
  const src = ac.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(dest);

  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));

  // 첫 프레임 미리 그리기
  drawFrame(ctx, els[0] || items[0].clip.img, items[0], 0, 0, timeline.total, o);

  await ac.resume();
  rec.start(500);
  const t0 = ac.currentTime + 0.15;
  src.start(t0);

  let cur = -1;
  await new Promise((resolve) => {
    const tick = () => {
      if (signal?.aborted) return resolve();
      const t = ac.currentTime - t0;
      if (t >= timeline.total) return resolve();
      const tt = Math.max(0, t);
      let idx = items.findIndex((x) => tt >= x.at && tt < x.at + x.dur);
      if (idx < 0) idx = items.length - 1;
      if (idx !== cur) {
        if (cur >= 0 && els[cur]) els[cur].pause();
        cur = idx;
        if (els[idx]) {
          prep(idx);
          els[idx].play().catch(() => {});
        }
        prep(idx + 1);
        prep(idx + 2);
      }
      const it = items[idx];
      const v = els[idx];
      if (v && v.currentTime >= it.end) v.pause();
      drawFrame(ctx, v || it.clip.img, it, tt - it.at, tt, timeline.total, o);
      onProgress?.(Math.min(1, tt / timeline.total));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // 마지막 프레임 조금 더 담고 종료
  await new Promise((r) => setTimeout(r, 200));
  rec.stop();
  try {
    src.stop();
  } catch {}
  await stopped;
  els.forEach((v) => {
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  });
  host.remove();
  ac.close();
  return { blob: new Blob(chunks, { type: (mime || "video/webm").split(";")[0] }), mime: mime || "video/webm" };
}
