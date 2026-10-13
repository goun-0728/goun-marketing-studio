"use client";

import { useEffect, useState } from "react";
import DiagnoseView from "@/components/DiagnoseView";
import { decodeReport } from "@/lib/report";

// 고객이 받는 진단서 링크: /d#<압축된 진단 데이터>
export default function SharedDiagnosis() {
  const [diag, setDiag] = useState(undefined);

  useEffect(() => {
    const load = () => {
      const d = decodeReport(location.hash.slice(1));
      setDiag(d);
      if (d) {
        const t = `${d.store} 페이지 분석`;
        document.title = t;
        setTimeout(() => (document.title = t), 300);
      }
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  if (diag === undefined) return null;
  if (!diag) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6f6b63" }}>분석 보고서를 열 수 없어요. 전체 링크를 다시 받아주세요.</div>;
  }
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <DiagnoseView diag={diag} />
    </div>
  );
}
