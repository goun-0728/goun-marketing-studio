"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { callAI, makeShareLink, copyText, downloadBlob, safeName } from "@/lib/client";
import { encodeReport, monthLabel, ranksFor, worksFor } from "@/lib/report";
import ReportView from "./ReportView";
import ExportButtons from "./ExportButtons";
import { Loading } from "./CopyTab";
import { fileName, yymm } from "@/lib/naming";

const KPI_DEFS = [
  { label: "매출", unit: "원" },
  { label: "주문 수", unit: "건" },
  { label: "방문자 수", unit: "명" },
  { label: "새 리뷰", unit: "개" },
  { label: "광고비", unit: "원", lowerIsBetter: true },
];
const WORK_TYPES = ["카드뉴스", "숏폼", "블로그", "SNS 글", "플레이스 소식", "광고 운영", "상세페이지", "상담", "기타"];

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const AGENCY = "gms_agency";

export default function ReportTab({ store, active = true }) {
  const storeName = store.name || "";
  const [month, setMonth] = useState(thisMonth());
  const [agency, setAgency] = useState({ name: "고운기획", contact: "" });
  const [kpis, setKpis] = useState(KPI_DEFS.map((k) => ({ ...k, cur: "", prev: "" })));
  const [works, setWorks] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [hidden, setHidden] = useState([]); // 리포트에서 뺄 키워드
  const [text, setText] = useState({ headline: "", summary: "", wins: [], nextPlan: [] });
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const viewRef = useRef(null);

  useEffect(() => {
    try {
      setAgency({ name: "고운기획", contact: "", ...JSON.parse(localStorage.getItem(AGENCY) || "{}") });
    } catch {}
  }, []);
  const saveAgency = (a) => {
    setAgency(a);
    try {
      localStorage.setItem(AGENCY, JSON.stringify(a));
    } catch {}
  };

  // 스토어·월 바뀌면 기록 불러오기 (저장된 리포트 초안이 있으면 그걸로)
  const draftKey = `gms_report_${storeName}_${month}`;

  // 다른 탭에서 진단·카드뉴스 등을 하고 돌아오면 순위·작업 기록만 새로 반영 (작성 중인 내용은 유지)
  useEffect(() => {
    if (!active || !storeName) return;
    setRanks(ranksFor(storeName, month));
    const fresh = worksFor(storeName, month);
    setWorks((cur) => {
      const has = new Set(cur.map((w) => `${w.type}|${w.title}|${w.date}`));
      const add = fresh.filter((w) => !has.has(`${w.type}|${w.title}|${w.date}`));
      return add.length ? [...cur, ...add] : cur;
    });
  }, [active, storeName, month]);
  useEffect(() => {
    setRanks(ranksFor(storeName, month));
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    } catch {}
    if (draft) {
      setKpis(draft.kpis);
      setWorks(draft.works);
      setText(draft.text);
      setHidden(draft.hidden || []);
      setMemo(draft.memo || "");
    } else {
      setKpis(KPI_DEFS.map((k) => ({ ...k, cur: "", prev: "" })));
      setWorks(worksFor(storeName, month));
      setText({ headline: "", summary: "", wins: [], nextPlan: [] });
      setHidden([]);
      setMemo("");
    }
  }, [storeName, month, draftKey]);

  // 입력할 때마다 초안 자동 저장
  useEffect(() => {
    if (!storeName) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ kpis, works, text, hidden, memo }));
    } catch {}
  }, [kpis, works, text, hidden, memo, draftKey, storeName]);

  const shownRanks = ranks.filter((r) => !hidden.includes(r.keyword));

  const report = useMemo(
    () => ({
      v: 1,
      agency: agency.name,
      contact: agency.contact,
      store: storeName,
      month,
      createdAt: new Date().toLocaleDateString("ko-KR"),
      headline: text.headline,
      summary: text.summary,
      wins: text.wins,
      nextPlan: text.nextPlan,
      kpis: kpis.map(({ label, unit, cur, prev, lowerIsBetter }) => ({ label, unit, cur, prev, lowerIsBetter })),
      ranks: shownRanks,
      works,
    }),
    [agency, storeName, month, text, kpis, shownRanks, works]
  );

  const setKpi = (i, k, v) => setKpis(kpis.map((x, j) => (j === i ? { ...x, [k]: v.replace(/[^\d.]/g, "") } : x)));
  const setWork = (i, k, v) => setWorks(works.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setList = (k, i, v) => setText({ ...text, [k]: text[k].map((x, j) => (j === i ? v : x)) });

  const write = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await callAI("report", store, { month: monthLabel(month), kpis, ranks: shownRanks, works, memo });
      setText({ headline: data.headline || "", summary: data.summary || "", wins: data.wins || [], nextPlan: data.nextPlan || [] });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2000);
  };

  const lastShare = useRef({ json: "", url: "" });
  const [shareUrl, setShareUrl] = useState("");
  const shareLink = async () => {
    const json = JSON.stringify({ ...report, createdAt: "" });
    // 내용이 그대로면 이전에 만든 링크 재사용
    if (lastShare.current.json === json && lastShare.current.url) {
      copyText(lastShare.current.url);
      return flash("링크 복사됨 — 카톡에 붙여넣으세요");
    }
    flash("링크 만드는 중…");
    const r = await makeShareLink("r", report, () => encodeReport(report));
    if (r.short) lastShare.current = { json, url: r.url };
    setShareUrl(r.url);
    copyText(r.url);
    flash(r.short ? "짧은 링크 복사됨 — 카톡에 붙여넣으세요" : r.reason === "no-kv" ? "긴 링크 복사됨 (짧은 링크는 Vercel 저장소 연결 후 가능)" : `긴 링크 복사됨 (${r.reason})`);
  };



  if (!storeName) {
    return (
      <div className="panel">
        <h2>📋 고객 월간 리포트</h2>
        <p className="hint" style={{ margin: 0 }}>왼쪽에서 고객사(스토어)를 먼저 선택하거나 상호명을 입력하세요.</p>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <h2>📋 고객 월간 리포트 — {storeName}</h2>
        <p className="hint">순위 기록·작업 내역은 자동으로 불러와요. 숫자만 채우고 AI 요약 → 링크로 보내면 끝. 입력 내용은 자동 저장돼요.</p>
        <div className="grid2">
          <label className="field">
            <span>리포트 월</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="field">
            <span>대행사명 · 연락처 (리포트 하단 표시)</span>
            <div className="row">
              <input type="text" value={agency.name} onChange={(e) => saveAgency({ ...agency, name: e.target.value })} style={{ flex: 1 }} />
              <input type="text" value={agency.contact} placeholder="010-0000-0000" onChange={(e) => saveAgency({ ...agency, contact: e.target.value })} style={{ flex: 1 }} />
            </div>
          </label>
        </div>
      </div>

      <div className="panel">
        <h2>① 핵심 숫자</h2>
        <p className="hint">스마트스토어센터 → 통계에서 이번 달 / 지난달 값을 옮겨 적으세요. 빈 칸은 리포트에서 빠져요.</p>
        <div className="kpigrid">
          <span />
          <b>이번 달</b>
          <b>지난달</b>
          {kpis.map((k, i) => (
            <Fragment key={k.label}>
              <span>{k.label} <small className="hint">({k.unit})</small></span>
              <input type="text" inputMode="numeric" value={k.cur} onChange={(e) => setKpi(i, "cur", e.target.value)} />
              <input type="text" inputMode="numeric" value={k.prev} onChange={(e) => setKpi(i, "prev", e.target.value)} />
            </Fragment>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>② 순위 (순위 추적 탭 기록)</h2>
        {ranks.length ? (
          <div className="chips" style={{ marginTop: 8 }}>
            {ranks.map((r) => {
              const on = !hidden.includes(r.keyword);
              return (
                <span key={r.keyword} className={`chip ${on ? "on" : ""}`} onClick={() => setHidden(on ? [...hidden, r.keyword] : hidden.filter((x) => x !== r.keyword))}>
                  {r.keyword} {r.start || "권외"}→{r.end || "권외"}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="hint" style={{ margin: 0 }}>{monthLabel(month)} 순위 기록이 없어요. 페이지 분석에서 검색 결과 화면까지 가져오면 여기에 자동으로 쌓여요.</p>
        )}
      </div>

      <div className="panel">
        <h2>③ 이번 달 작업 ({works.length}건)</h2>
        <p className="hint">카드뉴스·숏폼·전략 리포트를 다운로드하면 자동 기록돼요. 직접 추가도 가능 (링크를 넣으면 고객이 눌러볼 수 있어요).</p>
        {works.map((w, i) => (
          <div className="row workrow" key={i}>
            <select value={w.type} onChange={(e) => setWork(i, "type", e.target.value)} style={{ width: 120 }}>
              {[...new Set([...WORK_TYPES, w.type])].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input type="text" value={w.title} onChange={(e) => setWork(i, "title", e.target.value)} placeholder="작업 내용" style={{ flex: 2 }} />
            <input type="text" value={w.link || ""} onChange={(e) => setWork(i, "link", e.target.value)} placeholder="링크 (선택)" style={{ flex: 1.3 }} />
            <input type="date" value={w.date} onChange={(e) => setWork(i, "date", e.target.value)} style={{ width: 150 }} />
            <button className="btn small danger" onClick={() => setWorks(works.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn small" onClick={() => setWorks([...works, { type: "카드뉴스", title: "", link: "", date: `${month}-${String(new Date().getDate()).padStart(2, "0")}` }])}>
          + 작업 추가
        </button>
      </div>

      <div className="panel">
        <h2>④ 요약 · 다음 달 계획</h2>
        <label className="field" style={{ marginTop: 8 }}>
          <span>AI에게 줄 메모 (선택)</span>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 추석 연휴로 배송 지연 있었음, 다음 달 신메뉴 출시 예정" />
        </label>
        <div className="row">
          <button className="btn primary" onClick={write} disabled={busy}>{text.headline ? "AI로 다시 쓰기" : "AI로 요약 쓰기"}</button>
          {busy && <Loading text="리포트 쓰는 중 (10~20초)" />}
        </div>
        {err && <div className="error">{err}</div>}

        <label className="field" style={{ marginTop: 14 }}>
          <span>한 줄 헤드라인</span>
          <input type="text" value={text.headline} onChange={(e) => setText({ ...text, headline: e.target.value })} />
        </label>
        <label className="field">
          <span>요약</span>
          <textarea rows={3} value={text.summary} onChange={(e) => setText({ ...text, summary: e.target.value })} />
        </label>
        <div className="grid2">
          {[
            ["wins", "이번 달 성과"],
            ["nextPlan", "다음 달 계획"],
          ].map(([k, label]) => (
            <div key={k}>
              <span className="field" style={{ marginBottom: 4 }}><span>{label}</span></span>
              {text[k].map((v, i) => (
                <div className="row" key={i} style={{ marginBottom: 6 }}>
                  <input type="text" value={v} onChange={(e) => setList(k, i, e.target.value)} style={{ flex: 1 }} />
                  <button className="btn small danger" onClick={() => setText({ ...text, [k]: text[k].filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <button className="btn small" onClick={() => setText({ ...text, [k]: [...text[k], ""] })}>+ 추가</button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>⑤ 미리보기 · 보내기</h2>
          <div className="row">
            <button className="btn primary" onClick={shareLink}>🔗 공유 링크 복사</button>
            <ExportButtons title={`${storeName} ${monthLabel(month)} 마케팅 리포트`} fileBase={fileName({ store: storeName, kind: "월간리포트", date: yymm(month) })} getBody={() => viewRef.current?.innerHTML} />
            {msg && <span className="okmsg">{msg}</span>}
          </div>
        </div>
        <p className="hint" style={{ marginTop: 6 }}>링크 안에 리포트 내용이 담겨 있어 서버에 저장되지 않아요. 고객은 비밀번호 없이 휴대폰으로 바로 볼 수 있어요.</p>
        {shareUrl && <input className="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />}
        <div className="report-frame" ref={viewRef}>
          <ReportView report={report} />
        </div>
      </div>
    </>
  );
}
