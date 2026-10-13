"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import { callAI, copyText, downloadBlob, safeName } from "@/lib/client";
import { Loading } from "./CopyTab";
import { logWork } from "@/lib/report";
import ExportButtons from "./ExportButtons";
import { docShell } from "@/lib/exporter";
import { outKey, usePersistentState } from "@/lib/usePersist";
import { fileName } from "@/lib/naming";

const BUDGETS = ["0원 (무료 채널만)", "월 30만원 이하", "월 30~100만원", "월 100~300만원", "월 300만원 이상"];

export default function StrategyTab({ store }) {
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [goal, setGoal] = usePersistentState(outKey("strategy_goal", store.name), "");
  const [situation, setSituation] = usePersistentState(outKey("strategy_situation", store.name), "");
  const [md, setMd] = usePersistentState(outKey("strategy", store.name), "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const html = useMemo(() => (md ? marked.parse(md) : ""), [md]);

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const { text } = await callAI("strategy", store, { budget, goal, situation });
      setMd(text);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };



  return (
    <>
      <div className="panel">
        <h2>📊 마케팅 전략 리포트</h2>
        <p className="hint">고객사 상담·제안서용. 채널 우선순위, 4주 캘린더, KPI까지 정리해줘요.</p>

        <h3>월 예산</h3>
        <div className="chips">
          {BUDGETS.map((b) => (
            <span key={b} className={`chip ${budget === b ? "on" : ""}`} onClick={() => setBudget(b)}>
              {b}
            </span>
          ))}
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>목표</span>
            <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="예: 3개월 안에 월 매출 2배, 신규 리뷰 100개" />
          </label>
          <label className="field">
            <span>현재 상황 / 고민</span>
            <input type="text" value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="예: 광고비 대비 전환이 낮음, 재구매가 거의 없음" />
          </label>
        </div>

        <div className="row">
          <button className="btn primary" onClick={run} disabled={busy}>
            {busy ? "분석 중…" : "리포트 생성"}
          </button>
          {busy && <Loading text="전략을 짜는 중이에요 (30~60초)" />}
          {md && !busy && (
            <>
              <button className="btn" onClick={() => copyText(md)}>마크다운 복사</button>
              <ExportButtons
                title={`${store.name || "고객사"} 마케팅 전략 리포트`}
                fileBase={() => fileName({ store: store.name, kind: "전략" })}
                getBody={() => docShell({ kind: "마케팅 전략 리포트", store: store.name, title: `${store.name || "고객사"} 마케팅 전략 리포트`, sub: `월 예산 ${budget}${goal ? ` · 목표: ${goal}` : ""}`, inner: html })}
                onExport={() => logWork(store.name, "상담", "마케팅 전략 리포트 전달")}
              />
            </>
          )}
        </div>
        {err && <div className="error">{err}</div>}
      </div>

      {html && (
        <div className="panel report" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </>
  );
}
