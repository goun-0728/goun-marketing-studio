"use client";

import { useEffect, useRef, useState } from "react";
import { loadImports } from "@/lib/importer";
import { callAI, fetchLocal } from "@/lib/client";
import { localBundle, localForAI } from "@/lib/local";
import { logWork } from "@/lib/report";
import { outKey, usePersistentState } from "@/lib/usePersist";
import { fileName } from "@/lib/naming";
import { Loading } from "./CopyTab";
import ExportButtons from "./ExportButtons";
import LocalView from "./LocalView";

const BUDGETS = ["0원 (무료 채널만)", "월 30만원 이하", "월 30~100만원", "월 100~300만원", "월 300만원 이상"];

// 🏪 오프라인 가게 (식당·카페·미용실 등 스마트스토어 상품 페이지가 없는 업체)
export default function LocalTab({ store }) {
  const [f, setF] = usePersistentState(outKey("local_input", store.name), { name: "", area: "", biz: "", menu: "", budget: BUDGETS[1], goal: "", situation: "" });
  const [res, setRes] = usePersistentState(outKey("local", store.name), null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const viewRef = useRef(null);
  // '고운 진단' 버튼으로 가져온 네이버 플레이스 화면 (실제 등록 상태를 보고 점검)
  const [place, setPlace] = useState(null);
  useEffect(() => {
    const sync = () => setPlace(loadImports().place || null);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("gms-import", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("gms-import", sync);
    };
  }, []);
  const placeName = place ? String(place.title || "").replace(/\s*[:|-].*$/, "").trim() : "";
  const v = (k) => f[k] || { name: placeName || store.name, area: store.location, biz: store.category, menu: store.products }[k] || "";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const run = async () => {
    const input = { name: v("name").trim(), area: v("area").trim(), biz: v("biz").trim(), menu: v("menu").trim() };
    if (!input.area || !input.biz) return setErr("지역과 업종 키워드를 넣어 주세요. 예: 지역 '대구 수성구', 업종 '막창'");
    setErr("");
    try {
      setBusy("네이버에서 동네 가게·블로그·검색어를 모으는 중… (10~20초)");
      const data = localBundle(await fetchLocal(input));
      setBusy("전략을 짜는 중… (30~60초)");
      const { data: ai } = await callAI("local", store, { ...input, budget: f.budget, goal: f.goal, situation: f.situation, data: localForAI(data), placeText: place?.text || "" });
      let agency = {};
      try {
        agency = JSON.parse(localStorage.getItem("gms_agency") || "{}");
      } catch {}
      const now = new Date();
      setRes({ ...input, budget: f.budget, data, ai, placeAt: place ? new Date(place.at).toLocaleDateString("ko-KR") : null, agency: agency.name || "고운기획", contact: agency.contact || "", at: now.toISOString(), date: `${now.toLocaleDateString("ko-KR")} ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}` });
      logWork(store.name || input.name, "상담", `오프라인 가게 분석·전략 (${data.query})`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="panel">
        <h2>🏪 오프라인 가게 분석·전략</h2>
        <p className="hint">식당·카페·미용실처럼 스마트스토어 상품 페이지가 없는 가게용이에요. 네이버 지역 검색으로 주변 경쟁 가게와 블로그 언급 수를 비교하고, 동네 손님 검색어·시즌을 넣어 한 달 전략을 짜요.</p>
        <div className="imp-row" style={{ marginBottom: 12 }}>
          <span className={`imp-dot ${place ? "on" : ""}`}>📍</span>
          <div style={{ flex: 1 }}>
            <b>네이버 플레이스 화면</b> <span className="hint">(추천 · 실제 등록 상태를 보고 점검)</span>
            {place ? (
              <div className="hint" style={{ margin: 0 }}>✓ {placeName || "가게 정보"} · {new Date(place.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 가져옴</div>
            ) : (
              <div className="hint" style={{ margin: 0 }}>가게 이름을 네이버에서 검색해 가게 정보(영업시간·메뉴)가 보이는 화면에서 <b>🔍 고운 진단</b>을 누르세요. 지도(map.naver.com) 화면에서는 안 돼요.</div>
            )}
          </div>
        </div>
        <div className="grid2">
          <label className="field"><span>가게 이름 (네이버 지도에 등록된 이름)</span><input type="text" value={v("name")} onChange={set("name")} placeholder="예: 맛온 막창" /></label>
          <label className="field"><span>지역 *</span><input type="text" value={v("area")} onChange={set("area")} placeholder="예: 대구 수성구" /></label>
          <label className="field"><span>업종 키워드 *</span><input type="text" value={v("biz")} onChange={set("biz")} placeholder="예: 막창 / 카페 / 미용실" /></label>
          <label className="field"><span>대표 메뉴·서비스</span><input type="text" value={v("menu")} onChange={set("menu")} placeholder="예: 초벌막창, 소막창" /></label>
        </div>
        <h3>월 예산</h3>
        <div className="chips">
          {BUDGETS.map((b) => (
            <span key={b} className={`chip ${f.budget === b ? "on" : ""}`} onClick={() => setF({ ...f, budget: b })}>{b}</span>
          ))}
        </div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <label className="field"><span>목표 (선택)</span><input type="text" value={f.goal} onChange={set("goal")} placeholder="예: 평일 저녁 손님 늘리기" /></label>
          <label className="field"><span>지금 고민 (선택)</span><input type="text" value={f.situation} onChange={set("situation")} placeholder="예: 근처에 새 가게가 생겨 손님이 줄었어요" /></label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={run} disabled={!!busy}>{res ? "🔄 다시 분석하기" : "🔍 분석·전략 만들기"}</button>
          {busy && <Loading text={busy} />}
          {res && !busy && (
            <ExportButtons
              title={`${res.name || store.name || "가게"} 동네 마케팅 전략`}
              fileBase={() => fileName({ store: res.name || store.name, product: res.biz, kind: "가게전략" })}
              getBody={() => viewRef.current?.innerHTML}
            />
          )}
        </div>
        {err && <div className="error">{err}</div>}
        {res?.data?.notes?.length > 0 && <div className="hint" style={{ marginTop: 8 }}><b>못 가져온 데이터</b>{res.data.notes.map((n, i) => <div key={i}>· {n}</div>)}</div>}
      </div>
      {res && (
        <div className="panel">
          <div className="report-frame" ref={viewRef}>
            <LocalView r={res} />
          </div>
        </div>
      )}
    </>
  );
}
