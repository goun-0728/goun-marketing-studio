"use client";

import { useEffect, useState } from "react";
import ReportView from "@/components/ReportView";
import { decodeReport, monthLabel } from "@/lib/report";

// 고객이 받는 공유 링크: /r#<압축된 리포트 데이터>
export default function SharedReport() {
  const [report, setReport] = useState(undefined);

  useEffect(() => {
    const load = () => {
      const r = decodeReport(location.hash.slice(1));
      setReport(r);
      if (r) {
        const t = `${r.store} ${monthLabel(r.month)} 마케팅 리포트`;
        document.title = t;
        setTimeout(() => (document.title = t), 300); // Next 기본 제목이 덮어쓰는 것 방지
      }
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  if (report === undefined) return null;
  if (!report) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6f6b63" }}>
        리포트를 열 수 없어요. 링크가 잘렸을 수 있으니 전체 링크를 다시 받아주세요.
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <ReportView report={report} />
    </div>
  );
}
