"use client";

import { useEffect, useRef, useState } from "react";
import { loadImports, saveImport, searchKeyword } from "@/lib/importer";
import { callAI, copyText, fetchLocal, makeShareLink } from "@/lib/client";
import { encodeReport } from "@/lib/report";
import { upsertStoreCard } from "@/lib/storeCard";
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
  // 최근 분석 5개 (새로 분석하면 맨 앞, 가장 오래된 것은 빠짐) — 백업 대상(gms_diag_)
  const [hist, setHist] = usePersistentState("gms_diag_local_history", []);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState("");
  const putRes = (next) => {
    setRes(next);
    if (next?.id) setHist((h) => (Array.isArray(h) ? h : []).map((x) => (x.id === next.id ? next : x)));
  };
  useEffect(() => setShareUrl(res?._share || ""), [res]);
  const resFile = res ? res.fileBase ?? fileName({ store: res.name || store.name, product: res.biz, kind: "가게전략" }) : "";
  const share = async () => {
    if (res._share) {
      copyText(res._share);
      setMsg("링크 복사됨");
      return setTimeout(() => setMsg(""), 2000);
    }
    setSharing(true);
    const { _share, fileBase, ...data } = res;
    const out = await makeShareLink("l", data, () => encodeReport(data));
    setSharing(false);
    if (out.short) putRes({ ...res, _share: out.url });
    setShareUrl(out.url);
    copyText(out.url);
    setMsg(out.short ? "짧은 링크 복사됨" : "긴 링크 복사됨");
    setTimeout(() => setMsg(""), 2200);
  };
  const stamp = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
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
  const px = place?.extracted || null;
  const placeName = px?.name || "";
  const [reading, setReading] = useState(false);
  // 가져온 플레이스 화면 → AI가 가게 정보로 정리 (화면을 받은 탭에서 한 번만)
  useEffect(() => {
    if (!place || place.extracted || reading) return;
    let owner = false;
    try {
      owner = !!sessionStorage.getItem(`gms_owner_place:${place.at}`);
    } catch {}
    if (!owner) return;
    setReading(true);
    callAI("extract_place", store, { page: place, query: searchKeyword(place.url) })
      .then(({ data }) => {
        const next = saveImport({ ...place, extracted: data || {} });
        setPlace(next.place);
      })
      .catch((e) => setErr(`가게 화면 읽기 실패: ${e.message}`))
      .finally(() => setReading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.at, place?.extracted]);
  // 새 가게 화면을 읽으면 입력칸을 그 가게로 채움 (같은 화면이면 사용자가 고친 값 유지)
  useEffect(() => {
    if (!px || f._src === place.at) return;
    setF((cur) => ({
      ...cur,
      _src: place.at,
      name: px.name || cur.name,
      area: px.area || cur.area,
      biz: px.biz || (px.category ? String(px.category).split(/[,·]/)[0] : "") || cur.biz,
      menu: (px.menu || []).map((m) => m.name).filter(Boolean).slice(0, 4).join("/") || cur.menu,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [px, place?.at]);
  const v = (k) => f[k] || { name: placeName || store.name, area: store.location, biz: store.category, menu: store.products }[k] || "";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const run = async () => {
    const input = { name: v("name").trim(), area: v("area").trim(), biz: v("biz").trim(), menu: v("menu").trim() };
    if (!input.area || !input.biz) return setErr("지역과 업종 키워드를 넣어 주세요. 예: 지역 '대구 수성구', 업종 '막창'");
    if (!place && !confirm("가게 플레이스 화면을 아직 안 가져왔어요.\n\n가게 이름을 네이버에서 검색한 화면에서 '고운 진단'을 누르면 플레이스 점검까지 같이 돼요.\n\n화면 없이 지금 분석할까요? (플레이스 점검은 빠져요)")) return;
    setErr("");
    try {
      setBusy("네이버에서 동네 가게·블로그·검색어를 모으는 중… (10~20초)");
      const data = localBundle(await fetchLocal(input));
      setBusy("전략을 짜는 중… (30~60초)");
      const { data: ai } = await callAI("local", store, { ...input, budget: f.budget, goal: f.goal, situation: f.situation, data: localForAI(data), placeText: place?.text || "", placeInfo: px });
      let agency = {};
      try {
        agency = JSON.parse(localStorage.getItem("gms_agency") || "{}");
      } catch {}
      const now = new Date();
      const next = { id: Date.now(), ...input, budget: f.budget, data, ai, placeAt: place ? new Date(place.at).toLocaleDateString("ko-KR") : null, agency: agency.name || "고운기획", contact: agency.contact || "", at: now.toISOString(), date: `${now.toLocaleDateString("ko-KR")} ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}` };
      setRes(next);
      setHist((h) => [next, ...(Array.isArray(h) ? h : []).filter((x) => x.id !== next.id)].slice(0, 5));
      // 고객 카드 자동 저장 → 홍보 카피·카드뉴스 등 다른 탭이 이 가게 정보를 씀
      const prices = (px?.menu || []).map((m) => Number(m.price)).filter((x) => x > 0);
      upsertStoreCard(
        {
          name: input.name,
          category: px?.category || input.biz,
          channel: "오프라인 매장",
          location: px?.address || input.area,
          products: input.menu,
          price: prices.length ? `${Math.min(...prices).toLocaleString()}~${Math.max(...prices).toLocaleString()}원` : "",
          strengths: (ai?.strengths || []).join(", "),
          link: `네이버에서 '${input.name}' 검색`,
        },
        { fromName: store.name, carry: ["local", "local_input"], values: { local: next, local_input: f } }
      );
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
            {place && reading ? (
              <div className="hint" style={{ margin: 0 }}>가게 화면을 읽는 중… (10초 안팎)</div>
            ) : place ? (
              <div className="hint" style={{ margin: 0 }}>
                ✓ <b>{placeName || "가게 정보"}</b>
                {px?.category ? ` · ${px.category}` : ""}
                {px?.rating ? ` · ★${px.rating}` : ""}
                {px?.visitorReviews != null ? ` · 방문자 리뷰 ${Number(px.visitorReviews).toLocaleString()}` : ""}
                {px?.blogReviews != null ? ` · 블로그 리뷰 ${Number(px.blogReviews).toLocaleString()}` : ""}
                {px?.menu?.length ? ` · 메뉴 ${px.menu.length}개` : ""} · {new Date(place.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 가져옴
              </div>
            ) : (
              <div className="hint" style={{ margin: 0 }}><b>naver.com 검색창</b>에 가게 이름을 검색 → 가게 정보(영업시간·메뉴)가 보이는 화면에서 <b>🔍 고운 진단</b>을 누르세요. 네이버 <b>지도</b>(map.naver.com) 화면에서는 안 돼요.</div>
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
          {res?.at && !busy && <span className="hint" style={{ margin: 0 }}>지금 보는 분석: <b>{stamp(res.at)}</b></span>}
        </div>
        {err && <div className="error">{err}</div>}
        {res?.data?.notes?.length > 0 && <div className="hint" style={{ marginTop: 8 }}><b>못 가져온 데이터</b>{res.data.notes.map((n, i) => <div key={i}>· {n}</div>)}</div>}
      </div>
      {res && (
        <div className="panel">
          {Array.isArray(hist) && hist.length > 0 && (
            <div className="hist-tabs" role="tablist" aria-label="최근 분석">
              {hist.map((h, i) => (
                <button key={h.id} role="tab" aria-selected={h.id === res.id} className={h.id === res.id ? "on" : ""} onClick={() => setRes(h)}>
                  <b>
                    {i === 0 && <i>최신</i>}
                    {h.name || "가게"} · {h.biz}
                  </b>
                  <span>{h.at ? stamp(h.at) : h.date}</span>
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>가게 분석 미리보기</h2>
            <div className="row">
              <button className="btn primary" onClick={share} disabled={sharing}>{sharing ? "링크 만드는 중…" : "🔗 고객용 링크 복사"}</button>
              <ExportButtons title={`${res.name || store.name || "가게"} 동네 마케팅 전략`} fileBase={resFile} getBody={() => viewRef.current?.innerHTML} />
              {msg && <span className="okmsg">{msg}</span>}
            </div>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 6, alignItems: "center" }}>
            <span className="hint" style={{ margin: 0, padding: 0, background: "none", whiteSpace: "nowrap" }}>💾 저장 이름</span>
            <input type="text" value={resFile} onChange={(e) => putRes({ ...res, fileBase: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
          </div>
          {shareUrl && <input className="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />}
          <div className="report-frame" ref={viewRef}>
            <LocalView r={res} />
          </div>
        </div>
      )}
    </>
  );
}
