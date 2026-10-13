"use client";

// 다운로드 파일 이름 규칙: 업체_상품_종류_날짜_점수(변화)_핵심문제
// 예) 맛온_무뼈닭발_진단_261010_62점_배송비 / 맛온_월간리포트_2610 / 맛온_카드뉴스_261010
// 업체→상품→종류→날짜 순이라 이름순 정렬만 해도 업체별·시간순으로 정리됨

const clean = (s, max = 20) =>
  String(s || "")
    .replace(/[\\/:*?"<>|#%&{}$!'@`=]/g, "")
    .replace(/\s+/g, "")
    .slice(0, max);

export function yymmdd(d = new Date()) {
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function yymm(month) {
  // "2026-10" → "2610"
  const [y, m] = String(month || "").split("-");
  return y && m ? `${y.slice(2)}${m}` : yymmdd().slice(0, 4);
}

export function fileName({ store, product, kind, date, score, delta, tag }) {
  const parts = [clean(store) || "고객사", clean(product, 16), kind, date || yymmdd()];
  if (score != null && score !== "") parts.push(`${score}점${delta ? `(${delta > 0 ? "+" : ""}${delta})` : ""}`);
  if (tag) parts.push(clean(tag, 8));
  return parts.filter(Boolean).join("_");
}

// 진단 점수 기록 (같은 업체·키워드의 지난 점수와 비교해 변화 표시)
const SCORES = "gms_diag_scores";

export function previousScore(store, keyword) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES) || "{}");
    const list = all[`${clean(store)}|${clean(keyword)}`] || [];
    return list.length ? list[list.length - 1].score : null;
  } catch {
    return null;
  }
}

export function recordScore(store, keyword, score) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES) || "{}");
    const k = `${clean(store)}|${clean(keyword)}`;
    all[k] = [...(all[k] || []), { date: yymmdd(), score }].slice(-50);
    localStorage.setItem(SCORES, JSON.stringify(all));
  } catch {}
}

// 상품명에서 짧은 상품 이름 뽑기 (키워드가 없을 때)
export function shortProduct(productName, store) {
  const words = String(productName || "")
    .replace(/[\[\]()【】]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== store && !/^\d+(g|kg|ml|l|개|팩|입)?$/i.test(w));
  return words.slice(0, 2).join("");
}

export { clean as cleanName };
