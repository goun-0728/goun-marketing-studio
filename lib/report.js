"use client";

import LZString from "lz-string";

// ---------- 작업 내역 자동 기록 ----------
const WORKS = "gms_works"; // { "스토어": [{type,title,date,link}] }

export function logWork(store, type, title, link = "") {
  if (!store) return;
  try {
    const all = JSON.parse(localStorage.getItem(WORKS) || "{}");
    const list = all[store] || [];
    list.push({ type, title: title || type, date: new Date().toISOString().slice(0, 10), link });
    all[store] = list.slice(-300);
    localStorage.setItem(WORKS, JSON.stringify(all));
  } catch {}
}

export function worksFor(store, month) {
  try {
    const all = JSON.parse(localStorage.getItem(WORKS) || "{}");
    return (all[store] || []).filter((w) => w.date.startsWith(month));
  } catch {
    return [];
  }
}

// ---------- 순위 기록 → 월간 요약 ----------
export function ranksFor(store, month) {
  let hist = {};
  try {
    hist = JSON.parse(localStorage.getItem("gms_rank_history") || "{}");
  } catch {}
  const out = [];
  for (const [key, list] of Object.entries(hist)) {
    const [s, ...rest] = key.split("|");
    if (s !== store) continue;
    const keyword = rest.join("|");
    // 해당 월, 하루 1개(그날 마지막 측정)만
    const byDay = {};
    for (const p of list) {
      const local = new Date(p.t);
      const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
      if (day.startsWith(month)) byDay[day] = { d: day.slice(5), r: p.best || null };
    }
    const points = Object.keys(byDay).sort().map((d) => byDay[d]);
    if (!points.length) continue;
    const ranked = points.filter((p) => p.r);
    out.push({
      keyword,
      points,
      start: points[0].r,
      end: points[points.length - 1].r,
      best: ranked.length ? Math.min(...ranked.map((p) => p.r)) : null,
    });
  }
  return out;
}

// ---------- 공유 링크 ----------
export function encodeReport(report) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(report));
}

export function decodeReport(s) {
  try {
    return JSON.parse(LZString.decompressFromEncodedURIComponent(s) || "null");
  } catch {
    return null;
  }
}

export { monthLabel } from "./format";
