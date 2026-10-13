"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { callAI, downloadBlob, safeName, transcribe } from "@/lib/client";
import { ensureFonts } from "@/lib/draw";
import {
  analyzeFile,
  buildTimeline,
  drawPreview,
  recordShort,
  renderAudio,
  splitCaptions,
  spreadLines,
  toWav16k,
} from "@/lib/shorts";
import { Loading } from "./CopyTab";
import { logWork } from "@/lib/report";
import { fileName } from "@/lib/naming";

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

let sharedCtx = null;
const audioCtx = () => (sharedCtx ||= new AudioContext());

export default function ShortsTab({ store }) {
  const [clips, setClips] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(0);
  const [drag, setDrag] = useState(false);

  // 편집 옵션
  const [autoCut, setAutoCut] = useState(true);
  const [cutStrength, setCutStrength] = useState(0.5);
  const [maxDur, setMaxDur] = useState(30);
  const [photoDur, setPhotoDur] = useState(2.5);
  const [fit, setFit] = useState("blur");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [bgm, setBgm] = useState(null); // {name, buffer}
  const [bgmVol, setBgmVol] = useState(0.25);

  // 텍스트
  const [capMode, setCapMode] = useState("stt");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [titleBand, setTitleBand] = useState(true);
  const [cta, setCta] = useState("");
  const [captions, setCaptions] = useState([]);
  const [capStyle, setCapStyle] = useState("stroke");
  const [capSize, setCapSize] = useState(68);
  const [capY, setCapY] = useState(0.74);

  // 진행
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null); // {url, blob, mime}
  const [previewT, setPreviewT] = useState(0);

  const previewRef = useRef(null);
  const renderRef = useRef(null);
  const previewVideo = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    ensureFonts();
  }, []);

  const timeline = useMemo(
    () => buildTimeline(clips, { autoCut, cutStrength, maxDur: maxDur || 0, photoDur }),
    [clips, autoCut, cutStrength, maxDur, photoDur]
  );
  const ctaDur = cta ? 2.5 : 0;

  const overlay = useMemo(
    () => ({
      title,
      titleBand,
      cta,
      ctaDur,
      captions,
      capStyle,
      capSize,
      capY,
      capBoxColor: "#ffe14d",
      fit,
      accent: "#e8572a",
      brand: store.name,
    }),
    [title, titleBand, cta, ctaDur, captions, capStyle, capSize, capY, fit, store.name]
  );

  // ---------- 파일 추가 ----------
  const addFiles = async (files) => {
    const list = [...files].filter((f) => f.type.startsWith("video/") || f.type.startsWith("image/"));
    if (!list.length) return;
    setErr("");
    setLoadingFiles((n) => n + list.length);
    for (const f of list) {
      try {
        const c = await analyzeFile(f, audioCtx());
        setClips((cs) => [...cs, c]);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoadingFiles((n) => n - 1);
      }
    }
  };

  const addBgm = async (file) => {
    if (!file) return;
    try {
      const buffer = await audioCtx().decodeAudioData(await file.arrayBuffer());
      setBgm({ name: file.name, buffer });
    } catch {
      setErr("BGM 파일을 읽지 못했어요 (mp3, m4a, wav 권장)");
    }
  };

  const moveClip = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= clips.length) return;
    const next = [...clips];
    [next[i], next[j]] = [next[j], next[i]];
    setClips(next);
  };

  // ---------- 미리보기 ----------
  useEffect(() => {
    const cv = previewRef.current;
    if (!cv || !timeline.items.length) return;
    const t = Math.min(previewT, Math.max(0, timeline.total - 0.01));
    const it = timeline.items.find((x) => t >= x.at && t < x.at + x.dur) || timeline.items[0];
    if (it.clip.type === "video") {
      let v = previewVideo.current;
      if (!v) {
        v = previewVideo.current = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
      }
      const draw = () => drawPreview(cv, timeline, t, { ...overlay, previewVideo: () => v });
      const target = it.start + (t - it.at);
      if (v.src !== it.clip.url) v.src = it.clip.url;
      const onSeek = () => {
        v.removeEventListener("seeked", onSeek);
        draw();
      };
      v.addEventListener("seeked", onSeek);
      if (v.readyState >= 1) v.currentTime = target;
      else v.addEventListener("loadedmetadata", () => (v.currentTime = target), { once: true });
      return () => v.removeEventListener("seeked", onSeek);
    } else {
      drawPreview(cv, timeline, t, overlay);
    }
  }, [previewT, timeline, overlay, result]);

  // ---------- 자막 만들기 ----------
  const makeCaptions = async () => {
    if (!timeline.items.length) return;
    setErr("");
    try {
      if (capMode === "stt") {
        setBusy("음성 추출 중…");
        const voice = await renderAudio(timeline, { voiceOnly: true });
        const wav = await toWav16k(voice);
        if (wav.size > 4_300_000) throw new Error("음성이 너무 길어요(약 2분 초과). 최대 길이를 줄여 주세요.");
        setBusy("받아쓰는 중…");
        const { segments } = await transcribe(wav);
        if (!segments.length) throw new Error("인식된 말소리가 없어요. 'AI 홍보 자막'을 써보세요.");
        setCaptions(splitCaptions(segments, 16));
        // 타이틀/CTA가 비어 있으면 AI로 채우기
        if (!title || !cta) {
          setBusy("타이틀·CTA 작성 중…");
          const { data } = await callAI("shorts", store, { description: description || segments.map((s) => s.text).join(" "), duration: Math.round(timeline.total) });
          if (!title) setTitle(data.title || "");
          if (!cta) setCta(data.cta || "");
        }
      } else {
        setBusy("AI가 자막 쓰는 중…");
        const { data } = await callAI("shorts", store, { description, duration: Math.round(timeline.total) });
        const nextCta = cta || data.cta || "";
        setTitle(title || data.title || "");
        setCta(nextCta);
        setCaptions(spreadLines(data.lines || [], timeline.total, nextCta ? 2.5 : 0));
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const editCap = (i, k, v) => setCaptions(captions.map((c, j) => (j === i ? { ...c, [k]: k === "text" ? v : Number(v) } : c)));

  // ---------- 영상 만들기 ----------
  const render = async () => {
    if (!timeline.items.length) return;
    setErr("");
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      setBusy("오디오 믹싱 중…");
      const audio = await renderAudio(timeline, { keepOriginal, bgm: bgm?.buffer, bgmVol });
      setBusy("영상 합성 중… (탭을 닫거나 다른 탭으로 옮기지 마세요)");
      const { blob, mime } = await recordShort({
        canvas: renderRef.current,
        timeline,
        audioBuffer: audio,
        o: overlay,
        onProgress: setProgress,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      setResult({ url: URL.createObjectURL(blob), blob, mime });
    } catch (e) {
      setErr(`영상 생성 실패: ${e.message}`);
    } finally {
      setBusy("");
      setProgress(0);
      abortRef.current = null;
    }
  };

  const ext = result?.mime.includes("mp4") ? "mp4" : "webm";

  return (
    <>
      <div className="panel">
        <h2>🎬 숏폼 자동 편집</h2>
        <p className="hint">
          영상·사진을 올리면 무음 구간 자동 컷 → 세로(9:16) 변환 → 자막·타이틀·BGM까지 넣어 릴스/쇼츠용으로 뽑아줘요. 영상은 서버로 올라가지 않고 이 브라우저에서 처리돼요.
        </p>

        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById("shorts-file").click()}
        >
          📂 영상·사진을 끌어다 놓거나 클릭해서 추가 (여러 개 가능, 순서대로 이어붙여요)
          <input id="shorts-file" type="file" accept="video/*,image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>
        {loadingFiles > 0 && <Loading text={`파일 분석 중… (${loadingFiles}개 남음)`} />}

        {clips.length > 0 && (
          <div className="cliplist">
            {clips.map((c, i) => (
              <div className="clip" key={c.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="thumb" src={c.thumb} alt="" />
                <div className="info">
                  <b>{c.name}</b>
                  {c.type === "image" ? `사진 · ${photoDur}초` : `영상 · ${fmt(c.duration)}${c.audio ? "" : " · 소리 없음"}`}
                </div>
                <button className="btn small" onClick={() => moveClip(i, -1)} disabled={i === 0}>▲</button>
                <button className="btn small" onClick={() => moveClip(i, 1)} disabled={i === clips.length - 1}>▼</button>
                <button className="btn small danger" onClick={() => setClips(clips.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        )}

        {clips.length > 0 && (
          <p className="hint" style={{ marginBottom: 0 }}>
            완성 길이 <b>{timeline.total.toFixed(1)}초</b> · 컷 {timeline.items.length}개
            {timeline.removed > 0.5 && ` · 무음 ${timeline.removed.toFixed(1)}초 잘라냄`}
          </p>
        )}
      </div>

      <div className="panel">
        <h2>① 편집 설정</h2>
        <div className="grid2" style={{ marginTop: 10 }}>
          <label className="field">
            <span>무음 구간 자동 컷</span>
            <select value={autoCut ? cutStrength : "off"} onChange={(e) => (e.target.value === "off" ? setAutoCut(false) : (setAutoCut(true), setCutStrength(Number(e.target.value))))}>
              <option value="off">끄기</option>
              <option value={0.25}>약하게 (긴 공백만)</option>
              <option value={0.5}>보통</option>
              <option value={0.8}>강하게 (말 사이도 바짝)</option>
            </select>
          </label>
          <label className="field">
            <span>최대 길이</span>
            <select value={maxDur} onChange={(e) => setMaxDur(Number(e.target.value))}>
              <option value={15}>15초</option>
              <option value={30}>30초</option>
              <option value={60}>60초</option>
              <option value={90}>90초</option>
              <option value={0}>제한 없음</option>
            </select>
          </label>
          <label className="field">
            <span>가로 영상 처리</span>
            <select value={fit} onChange={(e) => setFit(e.target.value)}>
              <option value="blur">블러 배경 + 원본 전체</option>
              <option value="cover">세로로 꽉 채우기(가운데 크롭)</option>
            </select>
          </label>
          <label className="field">
            <span>사진 1장 노출 시간</span>
            <select value={photoDur} onChange={(e) => setPhotoDur(Number(e.target.value))}>
              {[1.5, 2, 2.5, 3, 4].map((n) => (
                <option key={n} value={n}>{n}초</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>원본 소리</span>
            <select value={keepOriginal ? "1" : "0"} onChange={(e) => setKeepOriginal(e.target.value === "1")}>
              <option value="1">유지</option>
              <option value="0">음소거 (BGM만)</option>
            </select>
          </label>
          <label className="field">
            <span>BGM {bgm && `· ${bgm.name}`}</span>
            <div className="row">
              <label className="btn small">
                {bgm ? "변경" : "음악 파일 선택"}
                <input type="file" accept="audio/*" hidden onChange={(e) => addBgm(e.target.files[0])} />
              </label>
              {bgm && (
                <>
                  <input type="range" min={0.05} max={1} step={0.05} value={bgmVol} onChange={(e) => setBgmVol(Number(e.target.value))} style={{ flex: 1 }} />
                  <button className="btn small" onClick={() => setBgm(null)}>✕</button>
                </>
              )}
            </div>
          </label>
        </div>
        <p className="hint" style={{ margin: 0 }}>BGM은 저작권 걱정 없는 음원(유튜브 오디오 보관함 등)을 쓰세요.</p>
      </div>

      <div className="panel">
        <h2>② 자막 · 타이틀</h2>
        <div className="chips" style={{ margin: "10px 0" }}>
          <span className={`chip ${capMode === "stt" ? "on" : ""}`} onClick={() => setCapMode("stt")}>🎙️ 말소리 받아쓰기 (대사 있는 영상)</span>
          <span className={`chip ${capMode === "ai" ? "on" : ""}`} onClick={() => setCapMode("ai")}>✨ AI 홍보 자막 (대사 없는 영상)</span>
        </div>
        <label className="field">
          <span>영상 내용 설명 (AI가 참고)</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="예: 무뼈닭발을 팬에 볶아서 치즈 올려 먹는 과정" />
        </label>
        <div className="row">
          <button className="btn primary" onClick={makeCaptions} disabled={!!busy || !timeline.items.length}>
            {captions.length ? "자막 다시 만들기" : "자막 만들기"}
          </button>
          {busy && !progress && <Loading text={busy} />}
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>상단 타이틀</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 닭발 이렇게 드셔보셨나요?" />
          </label>
          <label className="field">
            <span>마지막 CTA (2.5초)</span>
            <input type="text" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="예: 네이버에 '맛온' 검색" />
          </label>
          <label className="field">
            <span>자막 스타일</span>
            <select value={capStyle} onChange={(e) => setCapStyle(e.target.value)}>
              <option value="stroke">흰 글씨 + 검은 테두리</option>
              <option value="box">노란 박스</option>
            </select>
          </label>
          <label className="field">
            <span>타이틀 배경 / 자막 크기 · 위치</span>
            <div className="row">
              <select value={titleBand ? "1" : "0"} onChange={(e) => setTitleBand(e.target.value === "1")} style={{ width: "auto" }}>
                <option value="1">검은 띠</option>
                <option value="0">테두리만</option>
              </select>
              <select value={capSize} onChange={(e) => setCapSize(Number(e.target.value))} style={{ width: "auto" }}>
                <option value={56}>작게</option>
                <option value={68}>보통</option>
                <option value={82}>크게</option>
              </select>
              <select value={capY} onChange={(e) => setCapY(Number(e.target.value))} style={{ width: "auto" }}>
                <option value={0.62}>중간</option>
                <option value={0.74}>하단</option>
                <option value={0.82}>맨 아래</option>
              </select>
            </div>
          </label>
        </div>

        {captions.length > 0 && (
          <>
            <h3>자막 편집 ({captions.length}줄) — 시작/끝(초), 문구</h3>
            <div className="caplist">
              {captions.map((c, i) => (
                <div className="caprow" key={i}>
                  <input type="number" step="0.1" value={c.start} onChange={(e) => editCap(i, "start", e.target.value)} />
                  <input type="number" step="0.1" value={c.end} onChange={(e) => editCap(i, "end", e.target.value)} />
                  <input type="text" value={c.text} onChange={(e) => editCap(i, "text", e.target.value)} onFocus={() => setPreviewT(c.start + 0.05)} />
                  <button className="btn small danger" onClick={() => setCaptions(captions.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>③ 미리보기 · 완성</h2>
        <div className="stage" style={{ marginTop: 12 }}>
          <div>
            <div className="preview">
              {result ? <video src={result.url} controls playsInline /> : <canvas ref={previewRef} />}
            </div>
            {!result && timeline.items.length > 0 && (
              <div className="row" style={{ marginTop: 8 }}>
                <input type="range" min={0} max={Math.max(0.1, timeline.total - 0.05)} step={0.05} value={previewT} onChange={(e) => setPreviewT(Number(e.target.value))} style={{ flex: 1 }} />
                <span className="hint" style={{ margin: 0 }}>{previewT.toFixed(1)}s</span>
              </div>
            )}
            {/* 녹화 전용 캔버스 (화면에는 안 보임) */}
            <canvas ref={renderRef} style={{ position: "fixed", left: -99999, top: 0, width: 10, height: 10 }} />
          </div>
          <div>
            <p className="hint">
              실시간으로 합성하기 때문에 <b>영상 길이만큼 시간이 걸려요</b> (30초 영상 → 약 30초). 그동안 이 탭을 앞에 띄워두세요. 최신 크롬에서는 MP4로, 그 외 브라우저는 WebM으로 저장돼요.
            </p>
            <div className="row">
              <button className="btn primary" onClick={render} disabled={!!busy || !timeline.items.length}>
                🎬 영상 만들기
              </button>
              {busy && progress > 0 && (
                <button className="btn" onClick={() => abortRef.current?.abort()}>중지</button>
              )}
              {result && (
                <>
                  <button className="btn dark" onClick={() => {
                      downloadBlob(result.blob, `${fileName({ store: store.name, product: title, kind: "숏폼" })}.${ext}`);
                      logWork(store.name, "숏폼", `${title || "숏폼 영상"} (${Math.round(timeline.total)}초)`);
                    }}>
                    다운로드 (.{ext})
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      URL.revokeObjectURL(result.url);
                      setResult(null);
                    }}
                  >
                    다시 편집
                  </button>
                </>
              )}
            </div>
            {busy && progress > 0 && (
              <>
                <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>
                <span className="hint">{busy} {Math.round(progress * 100)}%</span>
              </>
            )}
            {result && ext === "webm" && (
              <p className="hint">WebM은 인스타 업로드가 안 될 수 있어요. 크롬 최신 버전에서 다시 만들면 MP4로 나와요.</p>
            )}
            {err && <div className="error">{err}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
