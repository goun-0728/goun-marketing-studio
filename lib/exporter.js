"use client";

import { downloadBlob } from "./client";
import { cleanName } from "./naming";

// 탭별 결과를 '보고서' 문서로 내보내기
// - PDF: 새 창에 A4 문서로 띄우고 인쇄 창 → 'PDF로 저장' (한글 글꼴·표가 선명하게 나옴)
// - HTML: 한 파일로 저장 (카톡·메일 첨부, 브라우저로 열기)

const FONT_LINK = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';

// 진단서·고객 리포트 외의 탭(카피·전략·카드뉴스)용 문서 스타일
export const DOC_CSS = `
.doc{--ink:#1b1a17;--muted:#6f6b63;--line:#e8e4dc;--soft:#f7f5f1;--accent:#e8572a;
  font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  color:var(--ink);max-width:760px;margin:0 auto;padding:36px 22px 48px;line-height:1.65;font-size:15px}
.doc *{box-sizing:border-box}
.doc-top{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);border-bottom:3px solid var(--ink);padding-bottom:10px}
.doc-top b{color:var(--ink)} .doc-top b i{color:var(--accent);font-style:normal}
.doc h1{font-size:26px;letter-spacing:-.02em;margin:22px 0 4px;line-height:1.3}
.doc .sub{color:var(--muted);margin:0 0 20px}
.doc h2{font-size:17px;margin:28px 0 10px;padding-top:14px;border-top:1px solid var(--line)}
.doc table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 16px}
.doc th,.doc td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.doc th{background:var(--soft)}
.doc .card{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px}
.doc .badge{display:inline-block;background:#fdeee8;color:var(--accent);font-weight:700;font-size:12px;border-radius:6px;padding:2px 8px;margin-bottom:6px}
.doc .ttl{font-weight:800;margin-bottom:4px}
.doc .body{white-space:pre-wrap;font-size:14px}
.doc .tags{color:#2a5bd7;font-size:13px;margin-top:6px}
.doc .slides{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.doc .slides img{width:100%;border-radius:8px;border:1px solid var(--line)}
.doc .foot{margin-top:36px;padding-top:14px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);text-align:center}
`;

// 인쇄(PDF)할 때 카드·표가 페이지 사이에서 잘리지 않게
const PRINT_CSS = `
@page{size:A4;margin:12mm}
html,body{margin:0;background:#fff}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{
  .rp,.doc{max-width:none;padding:0}
  h2{break-after:avoid;break-inside:avoid}
  /* 페이지 맨 아래에 제목만 남지 않게: 제목 밑에 보이지 않는 여백을 잡아 공간이 없으면 다음 장으로 */
  h2::after{content:"";display:block;height:140px;margin-bottom:-140px}
  .card,.dg-act,.dg-step,.dg-f,.dg-hidden>div,.dg-ba>div,.dg-plan li,.dg-rv>div,.dg-replies>div,.dg-offer>div,.dg-road .task,.rp-kpi,.rp-rank,.rp-list li,tr,.slides img,.dg-hero,.dg-cta,.dg-letter,.dg-strengths>div,.dg-scope,.dg-ideas>div,.dg-ad-group,.dg-ad-start{break-inside:avoid}
  .no-print{display:none!important}
}
.print-bar{position:sticky;top:0;background:#1b1a17;color:#fff;padding:10px 16px;font:14px/1.4 sans-serif;display:flex;gap:10px;align-items:center;justify-content:center}
.print-bar button{background:#e8572a;color:#fff;border:0;border-radius:8px;padding:6px 14px;font-weight:700;cursor:pointer}
`;

function agencyInfo() {
  try {
    return { name: "고운기획", contact: "", ...JSON.parse(localStorage.getItem("gms_agency") || "{}") };
  } catch {
    return { name: "고운기획", contact: "" };
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// 공통 머리말/꼬리말이 붙은 문서 본문 만들기 (카피·전략·카드뉴스용)
export function docShell({ kind, store, title, sub, inner }) {
  const a = agencyInfo();
  const date = new Date().toLocaleDateString("ko-KR");
  return `<div class="doc"><style>${DOC_CSS}</style>
<div class="doc-top"><b>${esc(a.name)} <i>·</i> ${esc(kind)}</b><span>${date}</span></div>
<h1>${esc(title || `${store || "고객사"} ${kind}`)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ""}
${inner}
<div class="foot">${esc(a.name)}${a.contact ? ` · ${esc(a.contact)}` : ""}</div></div>`;
}

function fullHtml(title, body, forPrint) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${FONT_LINK}<style>${PRINT_CSS}</style></head><body>${
    forPrint ? '<div class="print-bar no-print">인쇄 창에서 대상을 <b>&nbsp;‘PDF로 저장’&nbsp;</b>으로 선택하세요 <button onclick="print()">다시 열기</button></div>' : ""
  }${body}</body></html>`;
}

// 파일 이름: 업체_상품_종류_날짜_점수 형식(fileBase)이 있으면 그대로, 없으면 제목에서
const baseOf = (title, fileBase) => String(fileBase || "").split("_").map((p) => cleanName(p, 30)).filter(Boolean).join("_").slice(0, 90) || cleanName(title, 60) || "보고서";

export function saveHtml(title, body, fileBase) {
  downloadBlob(new Blob([fullHtml(title, body, false)], { type: "text/html" }), `${baseOf(title, fileBase)}.html`);
}

// 크롬 'PDF로 저장'은 문서 <title>을 파일 이름으로 씀 → 파일 이름을 제목으로 넣음
export function printPdf(title, body, fileBase) {
  if (fileBase) title = baseOf(title, fileBase);
  const w = window.open("", "_blank");
  if (!w) {
    alert("팝업이 막혀 있어요. 주소창 오른쪽의 팝업 차단 아이콘을 눌러 이 사이트를 허용해 주세요.");
    return;
  }
  w.document.open();
  w.document.write(fullHtml(title, body, true));
  w.document.close();
  const go = () => setTimeout(() => w.print(), 400);
  // 글꼴을 다 불러온 뒤 인쇄 창을 띄워야 글자가 깨지지 않음
  if (w.document.fonts?.ready) w.document.fonts.ready.then(go).catch(go);
  else w.onload = go;
}

export { esc };
