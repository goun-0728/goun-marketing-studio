"use client";

import { printPdf, saveHtml } from "@/lib/exporter";

// 보고서 다운로드 버튼 (PDF·HTML). getBody: 보고서 본문 HTML을 돌려주는 함수
export default function ExportButtons({ title, fileBase, getBody, onExport, primary = false }) {
  const run = (fn) => {
    const body = getBody();
    if (!body) return;
    fn(title, body, typeof fileBase === "function" ? fileBase() : fileBase);
    onExport?.();
  };
  const name = typeof fileBase === "function" ? "" : fileBase;
  return (
    <>
      <button className={`btn ${primary ? "dark" : ""}`} onClick={() => run(printPdf)} title={`인쇄 창에서 'PDF로 저장'을 고르세요${name ? ` · 파일 이름: ${name}.pdf` : ""}`}>
        📄 보고서 PDF
      </button>
      <button className="btn" onClick={() => run(saveHtml)} title={name ? `파일 이름: ${name}.html` : undefined}>
        HTML 저장
      </button>
    </>
  );
}
