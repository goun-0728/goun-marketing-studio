"use client";

export const KEY_STORAGE = "gms_app_key";

function appKey() {
  try {
    const k = (localStorage.getItem(KEY_STORAGE) || "").trim();
    // 헤더에는 영문만 들어가므로 한글 등은 인코딩 (서버에서 풀어서 비교)
    return /^[\x20-\x7e]*$/.test(k) ? k : encodeURIComponent(k);
  } catch {
    return "";
  }
}

// 🔑 저장 시 서버에 실제로 맞는지 확인
export async function verifyKey(key) {
  const k = String(key || "").trim();
  const v = /^[\x20-\x7e]*$/.test(k) ? k : encodeURIComponent(k);
  const r = await fetch("/api/ping", { headers: { "x-app-key": v } });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, ai: !!j.ai, error: j.error };
}

export async function callAI(task, store, options, images, imageUrls) {
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-key": appKey() },
    body: JSON.stringify({ task, store, options, images, imageUrls }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `오류 (${r.status})`);
  return j;
}




// 고객용 짧은 링크 만들기 (서버 저장소 연결 시). 저장소가 없으면 긴 링크로 대체
export async function makeShareLink(kind, data, longHash) {
  try {
    const r = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-key": appKey() },
      body: JSON.stringify({ kind, data }),
    });
    if (r.ok) {
      const { id } = await r.json();
      return { url: `${location.origin}/${kind}/${id}`, short: true };
    }
    const j = await r.json().catch(() => ({}));
    return { url: `${location.origin}/${kind}#${longHash()}`, short: false, reason: r.status === 501 ? "no-kv" : j.error || `오류 ${r.status}` };
  } catch (e) {
    return { url: `${location.origin}/${kind}#${longHash()}`, short: false, reason: e.message };
  }
}

export async function fetchMarket(payload) {
  const r = await fetch("/api/diagnose", {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-key": appKey() },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `오류 (${r.status})`);
  return j;
}

// 상세페이지 캡처를 AI에 보내기 좋게 축소 (긴 세로 캡처는 위에서부터 여러 장으로 자름)
export async function imageToDataUrls(file, { width = 800, sliceHeight = 2000, maxSlices = 3 } = {}) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const scale = Math.min(1, width / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const out = [];
  for (let y = 0; y < h && out.length < maxSlices; y += sliceHeight) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = Math.min(sliceHeight, h - y);
    c.getContext("2d").drawImage(img, 0, -y, w, h);
    out.push(c.toDataURL("image/jpeg", 0.8));
  }
  URL.revokeObjectURL(url);
  return out;
}

export async function transcribe(wavBlob) {
  const fd = new FormData();
  fd.append("file", wavBlob, "audio.wav");
  const r = await fetch("/api/transcribe", { method: "POST", headers: { "x-app-key": appKey() }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `오류 (${r.status})`);
  return j;
}

export function copyText(text) {
  return navigator.clipboard?.writeText(text);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function safeName(s) {
  return String(s || "goun").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
}
