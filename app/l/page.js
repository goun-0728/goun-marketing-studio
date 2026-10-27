"use client";

import { useEffect, useState } from "react";
import LocalView from "@/components/LocalView";
import { decodeReport } from "@/lib/report";

// 짧은 링크 저장소가 없을 때 쓰는 긴 링크: /l#<압축된 데이터>
export default function SharedLocal() {
  const [r, setR] = useState(undefined);
  useEffect(() => {
    const d = decodeReport(location.hash.slice(1));
    setR(d);
    if (d) document.title = `${d.name || "우리 가게"} 동네 마케팅 전략`;
  }, []);
  if (r === undefined) return null;
  if (!r) return <div style={{ padding: 40, textAlign: "center", color: "#6f6b63" }}>보고서를 열 수 없어요. 전체 링크를 다시 받아주세요.</div>;
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LocalView r={r} />
    </div>
  );
}
