"use client";

// ⚠️ 저장 키 규칙 — 업데이트해도 사용자 데이터가 사라지지 않도록
// 1. 아래 키 이름은 절대 바꾸거나 지우지 않는다. 구조를 바꿔야 하면 새 키를 추가하고 옛 키에서 옮겨온다(옛 키는 남겨둠).
// 2. 저장값을 읽을 때는 항상 기본값과 합쳐서 읽는다 ({ ...기본값, ...저장값 }) — 새 항목이 생겨도 옛 데이터가 깨지지 않게.
export const DATA_KEYS = [
  "gms_profiles", // 스토어(고객사) 프로필
  "gms_last_profile",
  "gms_agency", // 대행사명·연락처
  "gms_works", // 작업 기록
  "gms_rank_history", // 순위 기록
];
export const DATA_PREFIXES = ["gms_report_", "gms_diag_", "gms_out_"]; // 고객 리포트 초안, 진단 결과, 탭별 생성 결과

const SHADOW = "gms_profiles_shadow"; // 스토어 목록 예비 사본
const LAST_BACKUP = "gms_last_backup";

const isDataKey = (k) => DATA_KEYS.includes(k) || DATA_PREFIXES.some((p) => k.startsWith(p));

// 브라우저가 공간 부족 등으로 데이터를 스스로 지우지 않도록 '영구 저장' 요청
export async function requestPersist() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}

// 스토어 목록 읽기 — 본 저장이 비었거나 깨졌으면 예비 사본에서 복구
export function loadProfiles() {
  let main = null;
  try {
    main = JSON.parse(localStorage.getItem("gms_profiles") || "null");
  } catch {}
  if (main && typeof main === "object" && Object.keys(main).length) return main;
  try {
    const shadow = JSON.parse(localStorage.getItem(SHADOW) || "null");
    if (shadow && Object.keys(shadow).length) {
      localStorage.setItem("gms_profiles", JSON.stringify(shadow));
      return shadow;
    }
  } catch {}
  return main && typeof main === "object" ? main : {};
}

export function saveProfiles(profiles) {
  const s = JSON.stringify(profiles);
  try {
    localStorage.setItem("gms_profiles", s);
    // 예비 사본: 비어 있는 값으로 덮어쓰지 않음 (실수·버그로 전부 지워지는 것 방지)
    if (Object.keys(profiles).length) localStorage.setItem(SHADOW, s);
  } catch {}
}

// ---------- 백업 파일 ----------
export function exportBackup() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isDataKey(k)) data[k] = localStorage.getItem(k);
    }
    localStorage.setItem(LAST_BACKUP, String(Date.now()));
  } catch {}
  return { app: "goun-marketing-studio", version: 1, savedAt: new Date().toISOString(), data };
}

// 백업 불러오기: 지금 있는 데이터는 지우지 않고 합침
export function importBackup(backup) {
  if (backup?.app !== "goun-marketing-studio" || !backup.data) throw new Error("고운 마케팅 스튜디오 백업 파일이 아니에요.");
  let added = 0;
  for (const [k, raw] of Object.entries(backup.data)) {
    if (!isDataKey(k)) continue;
    const cur = localStorage.getItem(k);
    if (cur == null) {
      localStorage.setItem(k, raw);
      added++;
      continue;
    }
    // 객체형 데이터는 항목 단위로 합치기 (지금 있는 항목 우선)
    try {
      const a = JSON.parse(cur);
      const b = JSON.parse(raw);
      if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
        const merged = { ...b, ...a };
        for (const key of Object.keys(b)) {
          if (Array.isArray(a[key]) && Array.isArray(b[key])) {
            const seen = new Set(a[key].map((x) => JSON.stringify(x)));
            merged[key] = [...b[key].filter((x) => !seen.has(JSON.stringify(x))), ...a[key]];
          }
          if (!(key in a)) added++;
        }
        localStorage.setItem(k, JSON.stringify(merged));
      }
    } catch {}
  }
  const p = loadProfiles();
  if (Object.keys(p).length) localStorage.setItem(SHADOW, JSON.stringify(p));
  return added;
}

export function daysSinceBackup() {
  try {
    const t = Number(localStorage.getItem(LAST_BACKUP) || 0);
    return t ? Math.floor((Date.now() - t) / 86400000) : null;
  } catch {
    return null;
  }
}
