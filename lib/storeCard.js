"use client";

// 분석이 끝나면 고객 카드(스토어 프로필, gms_profiles)를 자동으로 만들거나 채우고 그 고객으로 전환
import { loadProfiles, saveProfiles } from "./storage";
import { outKey } from "./usePersist";

// profile: EMPTY_STORE 형식 일부. 이미 있는 고객이면 '비어 있는 칸만' 채움 (직접 고친 값은 유지)
// carry: 고객이 바뀌어도 방금 결과가 보이도록 옮길 탭별 저장 키 이름 (예: ["local", "local_input"])
export function upsertStoreCard(profile, { fromName = "", carry = [], values = {} } = {}) {
  const name = String(profile?.name || "").trim();
  if (!name) return null;
  const all = loadProfiles();
  const cur = all[name] || {};
  const merged = { tone: "친근하고 신뢰감 있게", ...cur };
  for (const [k, v] of Object.entries(profile)) {
    if (v == null || v === "") continue;
    if (!merged[k] || String(merged[k]).trim() === "") merged[k] = String(v).slice(0, 300);
  }
  merged.name = name;
  merged.updatedAt = new Date().toISOString();
  saveProfiles({ ...all, [name]: merged });
  try {
    localStorage.setItem("gms_last_profile", name);
    if (fromName !== name) {
      for (const tab of carry) {
        const v = tab in values ? JSON.stringify(values[tab]) : localStorage.getItem(outKey(tab, fromName));
        if (v != null) localStorage.setItem(outKey(tab, name), v);
      }
    }
  } catch {}
  window.dispatchEvent(new CustomEvent("gms-store-select", { detail: { name, created: !cur.name } }));
  return { name, created: !cur.name };
}
