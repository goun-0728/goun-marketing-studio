"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callAI, copyText, downloadBlob, fetchMarket, makeShareLink, safeName } from "@/lib/client";
import {
  analyzeAds,
  analyzeCompliance,
  analyzeExposure,
  analyzeMargin,
  analyzeOffer,
  analyzePrice,
  analyzeOptionPrice,
  analyzeCategory,
  analyzeSeason,
  analyzeTitle,
  analyzeTrust,
  grade,
  keywordFindings,
  keywordOpportunities,
  parseAdReport,
  reviewIssueFindings,
  totalScore,
} from "@/lib/diagnose";
import { buildBookmarklet } from "@/lib/bookmarklet";
import { clearImport, loadImports, productNoFrom, saveImport, searchKeyword } from "@/lib/importer";
import { encodeReport, logWork } from "@/lib/report";
import { usePersistentState } from "@/lib/usePersist";
import DiagnoseView from "./DiagnoseView";
import ExportButtons from "./ExportButtons";
import { scienceBundle } from "@/lib/science";
import { cleanName, fileName, previousScore, recordScore, shortProduct, yymmdd } from "@/lib/naming";
import { Loading } from "./CopyTab";

const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? "" : String(v));
const EMPTY = { storeName: "", product: "", keyword: "", subs: "", category: "", price: "", shipFee: "", reviews: "", rating: "", cost: "", courier: "", feeRate: "6", adPerOrder: "" };
const when = (t) => (t ? new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

// AI가 리뷰 수·평점을 못 읽었을 때 페이지 내부 값·단서에서 직접 찾기
function reviewFallback(page) {
  const p = page?.pick || {};
  const n = (v) => (v == null || v === "" || isNaN(Number(String(v).replace(/,/g, ""))) ? null : Number(String(v).replace(/,/g, "")));
  let reviews = n(p.totalReviewCount) ?? n(p.reviewCount) ?? n(p.ratingCount);
  let rating = n(p.averageReviewScore) ?? n(p.ratingValue) ?? n(p.reviewScore) ?? n(p.averageScore);
  for (const h of page?.hints || []) {
    if (reviews == null) {
      const m = h.match(/(?:리뷰|후기|구매평)\s*(?:수)?\s*\(?\s*([\d,]+)/);
      if (m) reviews = n(m[1]);
    }
    if (rating == null) {
      const m = h.match(/(?:평점|별점|★)\s*([0-5](?:\.\d{1,2})?)(?!\d)/) || h.match(/([0-5]\.\d{1,2})\s*\/\s*5/);
      if (m) rating = n(m[1]);
    }
  }
  if (rating != null && (rating < 0 || rating > 5)) rating = null;
  return { reviews, rating };
}

// 가져온 검색 결과 미리보기 — 진단 전에 실제 화면과 같은지 눈으로 확인
function SearchPreview({ sx, storeName }) {
  const organic = (sx.items || []).filter((x) => !x.isAd);
  if (!organic.length) return null;
  const n = norm(storeName);
  const malls = organic.filter((x) => !x.isCatalog && x.mall).map((x) => norm(x.mall));
  const top = malls.length ? Object.entries(malls.reduce((a, m) => ((a[m] = (a[m] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0] : null;
  const oneStore = top && malls.length >= 5 && top[1] / malls.length >= 0.6;
  return (
    <div className="sx-prev">
      {oneStore && <div className="error" style={{ margin: "6px 0" }}>상품 대부분이 한 스토어 것이에요. 네이버쇼핑 검색 결과가 아니라 스토어 안 목록을 가져온 것 같아요. 네이버쇼핑에서 다시 검색해 버튼을 눌러 주세요.</div>}
      <ol>
        {organic.slice(0, 5).map((x, i) => (
          <li key={i} className={n && norm(x.mall) === n ? "me" : ""}>
            <span>{String(x.title || "").slice(0, 34)}</span>
            <b>{Number(x.price || 0).toLocaleString()}원</b>
            <i>{x.isCatalog ? "가격비교" : x.mall}</i>
          </li>
        ))}
      </ol>
      <div>화면과 순서·가격이 다르면 검색 결과 화면에서 버튼을 다시 눌러 주세요 (광고 제외 순서).</div>
    </div>
  );
}

// AI 답이 없을 때도 구성안이 빠지지 않게: 어느 상품에나 맞는 기본 구성 (참고용)
function basicDetailPlan(product, px = {}) {
  const praise = px.reviewPraise?.[0];
  const issue = px.reviewIssues?.[0];
  return [
    { section: "첫 화면", now: "", todo: "상품이 무엇이고 왜 사야 하는지 한 줄 + 핵심 장점 3가지를 큰 글씨로", example: "" },
    { section: "구매 이유", now: "", todo: "손님이 겪는 불편 → 이 상품으로 해결되는 장면을 사진과 짧은 문장으로", example: praise ? `손님 후기: "${praise}"` : "" },
    { section: "차별점", now: "", todo: "비슷한 상품과 다른 점을 비교표나 숫자(용량·소재·원산지)로", example: "" },
    { section: "사용·조리 방법", now: "", todo: "처음 쓰는 손님도 따라 할 수 있게 단계별 사진 3~4컷", example: "" },
    { section: "불만 미리 안내", now: "", todo: issue ? `리뷰에 나온 '${issue}'에 대한 안내를 미리 넣기` : "자주 생기는 오해(사이즈·보관·주의사항)를 미리 안내", example: "" },
    { section: "신뢰 정보", now: "", todo: "후기 하이라이트·인증·원산지·제조 과정", example: "" },
    { section: "구성·배송·교환", now: "", todo: "구성품, 출고일, 배송비 조건, 교환·환불을 표로", example: "" },
  ];
}

// 분석 시각 표시: "10. 12. 16:58" / "3분 전"
const stamp = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

function toMarket(ex, keyword, productNo, storeNm) {
  const items = ex?.items || [];
  const organic = items.filter((x) => !x.isAd);
  const top = organic.map((x, i) => ({
    rank: i + 1,
    title: String(x.title || ""),
    mall: x.mall || "",
    price: Number(x.price) || 0,
    reviews: x.reviews == null ? null : Number(x.reviews) || 0,
    productType: x.isCatalog ? 1 : 2,
    category: x.category || "",
    link: x.link || "",
  }));
  const n = norm(storeNm);
  const me = top.find((x) => (productNo && String(x.link).includes(productNo)) || (n && norm(x.mall) === n));
  return {
    keyword,
    total: Number(ex?.total) || top.length,
    top: top.slice(0, 40),
    myRank: me?.rank || null,
    mine: me ? [me] : [],
    scanned: top.length,
    adCount: items.length - organic.length,
    myAd: items.some((x) => x.isAd && n && norm(x.mall) === n),
  };
}

export default function DiagnoseTab({ store }) {
  const [imports, setImports] = useState({});
  const [f, setF] = usePersistentState("gms_out_diagnose_input", EMPTY);
  const [ad, setAd] = useState(null);
  const [adName, setAdName] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [diag, setDiag] = usePersistentState("gms_out_diagnose_result", null);
  // 최근 분석 5개 (새로 분석하면 맨 앞에 추가, 가장 오래된 것은 빠짐) — 백업 대상(gms_diag_)
  const [hist, setHist] = usePersistentState("gms_diag_history", []);
  // 보고 있는 분석 결과를 고치면(저장 이름·공유 링크) 기록에도 같이 반영
  const putDiag = (next) => {
    setDiag(next);
    if (next?.id) setHist((h) => (Array.isArray(h) ? h : []).map((x) => (x.id === next.id ? next : x)));
  };
  // 예전에 만든 분석(기록 기능 전)도 기록 탭에 넣어 둠
  useEffect(() => {
    if (!diag || !Array.isArray(hist)) return;
    if (!diag.id) {
      const withId = { ...diag, id: Date.now() };
      setDiag(withId);
      setHist((h) => [withId, ...(Array.isArray(h) ? h : [])].slice(0, 5));
    } else if (!hist.some((x) => x.id === diag.id) && !hist.length) {
      setHist([diag]);
    }
  }, [diag, hist, setDiag, setHist]);
  const [notes, setNotes] = usePersistentState("gms_out_diagnose_notes", []);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [agency, setAgency] = useState({ name: "고운기획", contact: "" });
  const [bm, setBm] = useState("");
  const viewRef = useRef(null);
  const bmRef = useRef(null);
  const tried = useRef(new Set()); // 같은 화면 읽기 실패 시 무한 재시도 방지

  const product = imports.product;
  const search = imports.search;
  const px = product?.extracted;
  // 스토어 안 목록을 검색 결과로 잘못 가져온 기록은 쓰지 않음 (예전 버튼으로 가져온 것 포함)
  const badSearch = /smartstore\.naver\.com|brand\.naver\.com/.test(search?.url || "");
  const sx = badSearch ? null : search?.extracted;
  const sName = f.storeName || px?.storeName || store.name || "";

  // 북마크 버튼 코드 (이 사이트 주소로 생성) — React는 javascript: 링크를 막아서 직접 넣음
  useEffect(() => {
    const code = buildBookmarklet(location.origin);
    setBm(code);
    if (bmRef.current) bmRef.current.setAttribute("href", code);
  }, []);

  useEffect(() => {
    try {
      setAgency({ name: "고운기획", contact: "", ...JSON.parse(localStorage.getItem("gms_agency") || "{}") });
    } catch {}
    const sync = () => setImports(loadImports());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("gms-import", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("gms-import", sync);
    };
  }, []);

  // 가져온 화면 → AI가 글자를 읽어 정보로 정리 (한 번만, 결과는 저장)
  const extract = useCallback(async (kind, data) => {
    setErr("");
    // 네이버쇼핑 검색 결과가 아닌 화면(스토어 안 상품 목록 등)은 경쟁 비교에 쓰면 안 됨
    if (kind !== "product" && (data.kind === "store" || /smartstore\.naver\.com|brand\.naver\.com/.test(data.url || ""))) {
      clearImport("search");
      setImports(loadImports());
      setErr("방금 누른 화면은 스토어 안의 상품 목록이에요. 경쟁 비교는 네이버쇼핑에서 키워드로 검색한 화면(search.shopping.naver.com)에서 버튼을 눌러야 해요.");
      return;
    }
    setBusy(kind === "product" ? "상품 페이지를 읽는 중… (10~20초)" : "검색 결과를 읽는 중… (15~30초)");
    try {
      const kw = searchKeyword(data.url);
      let ex;
      if (kind !== "product" && (data.sitems || []).length >= 5) {
        // 페이지 데이터에 상품 목록이 그대로 있으면 AI 없이 바로 사용 (가장 정확·무료)
        ex = { keyword: kw, total: null, items: data.sitems.map((x) => ({ ...x, link: x.h || null })), source: "data" };
      } else {
        ({ data: ex } = await callAI(kind === "product" ? "extract_product" : "extract_search", store, { page: data, keyword: kw }));
        if (kind !== "product" && Array.isArray(ex?.items) && (data.cards || []).length) {
          // 카드 번호(c)로 링크 붙이기
          ex.items = ex.items.map((x) => ({ ...x, li: undefined, link: x.c != null ? data.cards[x.c]?.h || null : null }));
          ex.source = "cards";
        }
      }
      // 상품: 옵션별 가격 — 페이지 데이터(정확) 우선, 없으면 AI가 화면 글자에서 읽은 값
      if (kind === "product" && ex) {
        const fromState = (data.opts || []).filter((o) => o.n).map((o) => ({ name: o.n, delta: o.p, soldOut: !o.u || o.s === 0 }));
        const fromText = Array.isArray(ex.optionPrices) ? ex.optionPrices.map((o) => ({ name: String(o.name || ""), delta: Number(o.delta) || 0, soldOut: !!o.soldOut })) : [];
        ex.optionPrices = fromState.length ? fromState : fromText.length ? fromText : null;
        if (ex.optionPrices) ex.options = ex.optionPrices.map((o) => o.name).slice(0, 6);
        if (data.sups?.length) ex.supplements = data.sups.map((x) => ({ name: x.n, price: x.p }));
      }
      // 검색 결과: 짧은 이름(t,p,m…)으로 받은 걸 원래 모양으로 + 링크 번호 → 실제 주소
      if (kind !== "product" && Array.isArray(ex?.items)) {
        ex.items = ex.items.map((x) => ({
          title: x.title ?? x.t ?? "",
          price: x.price ?? x.p ?? 0,
          mall: x.mall ?? x.m ?? "",
          isAd: !!(x.isAd ?? x.ad),
          isCatalog: !!(x.isCatalog ?? x.cat),
          reviews: x.reviews ?? x.rv ?? null,
          category: String(x.category ?? x.cp ?? "").replace(/\s*[>›＞]\s*/g, ">").trim(),
          link: x.link ?? (x.li != null ? data.links?.[x.li]?.h || null : null),
        }));
      }
      const next = saveImport({ ...data, extracted: { ...ex, keyword: ex.keyword || kw } });
      setImports({ ...next });
    } catch (e) {
      setErr(`화면 읽기 실패: ${e.message}`);
    } finally {
      setBusy("");
    }
  }, [store]);

  useEffect(() => {
    if (busy) return;
    for (const [kind, d] of [["product", product], ["search", search]]) {
      if (!d || d.extracted) continue;
      const id = `${kind}:${d.at}`;
      if (tried.current.has(id)) continue;
      // 화면을 받은 탭만 읽음. 단, 20초가 지나도 안 읽혔으면(그 탭을 닫은 경우 등) 이 탭이 읽음
      let owner = false;
      try {
        owner = sessionStorage.getItem(`gms_owner_${id}`) === "1";
      } catch {}
      if (!owner && Date.now() - d.at < 20000) continue;
      tried.current.add(id);
      // 스튜디오 탭이 여러 개 열려 있어도 한 탭에서만 읽도록 잠금 (AI 비용 중복 방지)
      try {
        const lock = Number(localStorage.getItem(`gms_lock_${id}`) || 0);
        if (Date.now() - lock < 90000) continue;
        localStorage.setItem(`gms_lock_${id}`, String(Date.now()));
      } catch {}
      extract(kind, d);
      break;
    }
  }, [product, search, busy, extract]);

  // 실패한 화면 읽기 다시 시도 (비밀번호·키를 나중에 넣은 경우)
  const retry = useCallback(() => {
    tried.current.clear();
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("gms_lock_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    setErr("");
    setImports({ ...loadImports() });
  }, []);

  useEffect(() => {
    window.addEventListener("gms-key", retry);
    return () => window.removeEventListener("gms-key", retry);
  }, [retry]);

  // 정리된 정보로 입력칸 채우기 (사용자가 고친 값은 유지)
  useEffect(() => {
    if (!px) return;
    setF((prev) => {
      // 다른 상품을 새로 가져왔으면 입력칸을 그 상품 기준으로 새로 채움
      const cur = prev._src === product?.at ? prev : { ...EMPTY, feeRate: prev.feeRate || "6", _src: product?.at };
      return {
      ...cur,
      storeName: cur.storeName || px.storeName || store.name || "",
      product: px.productName || cur.product,
      price: num(px.salePrice || px.price) || cur.price,
      shipFee: num(px.shipFee) || cur.shipFee,
      reviews: num(px.reviews) || num(reviewFallback(product).reviews) || cur.reviews,
      rating: num(px.rating) || num(reviewFallback(product).rating) || cur.rating,
      category: px.category || cur.category,
      keyword: cur.keyword || sx?.keyword || px.mainKeyword || "",
      subs: cur.subs || (px.subKeywords || []).join(", "),
      };
    });
  }, [px, sx?.keyword, store.name, product?.at, setF]);

  useEffect(() => {
    if (sx?.keyword) setF((cur) => ({ ...cur, keyword: sx.keyword }));
  }, [sx?.keyword]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addCsv = async (file) => {
    if (!file) return;
    setErr("");
    try {
      const buf = await file.arrayBuffer();
      let text = new TextDecoder("utf-8").decode(buf);
      if (!/키워드|비용/.test(text)) text = new TextDecoder("euc-kr").decode(buf);
      const parsed = parseAdReport(text);
      setAd(parsed);
      setAdName(`${file.name} · 키워드 ${parsed.rows.length}개`);
    } catch (e) {
      setAd(null);
      setAdName("");
      setErr(e.message);
    }
  };

  const searchUrl = f.keyword.trim() ? `https://search.shopping.naver.com/ns/search?query=${encodeURIComponent(f.keyword.trim())}` : "";

  const run = async () => {
    if (!px) return setErr("먼저 스토어 상품 페이지에서 '고운 진단' 버튼을 눌러 화면을 가져오세요.");
    setErr("");
    setNotes([]);
    const skipped = [];
    try {
      const keyword = f.keyword.trim();
      const subs = f.subs.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      const pno = productNoFrom(product.url);

      setBusy("검색량·시즌 확인 중…");
      let extra = { trend: null, keywords: null, notes: [] };
      try {
        // 카테고리 코드: 세부 → 상위 순 (쇼핑인사이트는 세부 카테고리에 데이터가 없으면 상위로)
        const pk = product?.pick || {};
        const catIds = [...String(pk.wholeCategoryId || "").split(/[>\s]+/).filter(Boolean).reverse(), pk.categoryId].filter((x) => /^\d{6,}$/.test(String(x || "")));
        extra = await fetchMarket({ keywords: [keyword, ...subs].filter(Boolean), categoryIds: [...new Set(catIds)] });
      } catch (e) {
        extra.notes = [e.message];
      }

      // 연관 키워드에서 다른 상품을 찾는 검색어 걸러내기 (생리대·아기블랭킷 같은 엉뚱한 키워드 방지)
      const kwPool = [...new Map([...(extra.allKeywords || []), ...(extra.keywords || [])].map((k) => [k.keyword.replace(/\s+/g, ""), k])).values()];
      if (kwPool.length) {
        setBusy("상품과 맞는 키워드만 고르는 중…");
        const compact = (x) => String(x || "").replace(/\s+/g, "").toLowerCase();
        let keep = null;
        try {
          const { data } = await callAI("kw_filter", store, { productName: f.product, category: f.category || px.category, keyword, keywords: kwPool.sort((a, b) => b.volume - a.volume).slice(0, 120).map((k) => k.keyword) });
          if (Array.isArray(data?.keep) && data.keep.length) keep = new Set(data.keep.map(compact));
        } catch {}
        const main = compact(keyword);
        const ok = (k) => compact(k.keyword) === main || (keep ? keep.has(compact(k.keyword)) : true);
        const dropped = kwPool.filter((k) => !ok(k)).map((k) => k.keyword);
        if (extra.keywords) extra.keywords = extra.keywords.filter(ok);
        if (extra.allKeywords) extra.allKeywords = extra.allKeywords.filter(ok);
        extra.dropped = dropped;
        if (!keep) skipped.push("키워드 관련성 확인 (AI 응답 없음 — 연관 키워드에 다른 상품 검색어가 섞일 수 있어요)");
      }

      setBusy("점수 계산 중…");
      const market = sx && keyword ? toMarket(sx, keyword, pno, sName) : null;
      if (!market) skipped.push("검색 순위·경쟁 비교 (검색 결과 화면을 가져오면 추가돼요)");
      const adTotals = ad?.rows?.reduce((a, r) => ({ cost: a.cost + r.cost, conv: a.conv + r.conv }), { cost: 0, conv: 0 });
      const adPerOrder = Number(f.adPerOrder) || (adTotals?.conv ? adTotals.cost / adTotals.conv : 0);
      const marginArea = f.cost ? analyzeMargin({ price: +f.price, shipFee: +f.shipFee, cost: +f.cost, courier: +f.courier, feeRate: +f.feeRate, adPerOrder }) : null;
      if (!marginArea) skipped.push("마진 구조 (원가를 넣으면 추가돼요)");
      const categoryArea = market ? analyzeCategory(f.category || px.category, market) : null;
      if (!categoryArea) skipped.push("카테고리 비교 (검색 결과 화면을 가져오면 추가돼요)");
      const optPrice = analyzeOptionPrice(+f.price, px.optionPrices);
      let priceArea = market ? analyzePrice(+f.price, market) : null;
      if (optPrice?.findings.length) {
        if (priceArea) {
          priceArea.findings.push(...optPrice.findings);
          // 실제 최저 구성가로도 경쟁 가격과 비교
          if (optPrice.stats.minEff < +f.price && priceArea.stats?.prices) {
            const p = priceArea.stats.prices;
            const below = p.filter((x) => x < optPrice.stats.minEff).length / p.length;
            priceArea.findings.push({ level: below <= 0.5 ? "good" : "warn", title: `가장 싼 구성(${optPrice.stats.minEff.toLocaleString()}원)은 경쟁 상품 100개 중 ${Math.max(1, Math.round(below * 100))}번째로 싼 가격이에요`, detail: `그런데 검색 목록에는 대표 가격(${(+f.price).toLocaleString()}원)이 보여서 100개 중 ${Math.max(1, Math.round(priceArea.stats.below * 100))}번째로 보여요. 같은 상품인데 보이는 가격 때문에 손해를 보고 있어요.`, fix: "" });
          }
        } else {
          priceArea = { key: "price", label: "가격 경쟁력", max: 15, score: optPrice.findings.some((x) => x.level === "warn") ? 10 : 15, findings: optPrice.findings };
        }
      }
      const adsArea = analyzeAds(ad, marginArea?.margin);

      const kwOp = keywordOpportunities(f.product, extra.keywords, keyword);
      const titleArea = market?.top?.length >= 10 ? analyzeTitle(f.product, keyword, market.top) : keyword ? analyzeTitle(f.product, keyword, null) : null;
      if (titleArea) titleArea.findings.push(...keywordFindings(kwOp));

      const trustArea = analyzeTrust(f.reviews, f.rating);
      if (trustArea) trustArea.findings.push(...reviewIssueFindings(px.reviewIssues, px.reviewPraise));

      const exposureArea = market ? analyzeExposure(market, f.category) : null;
      if (exposureArea && market.adCount) {
        exposureArea.findings.push({
          level: market.myAd ? "good" : "warn",
          title: `화면 상단 광고 ${market.adCount}개${market.myAd ? " (내 광고 포함)" : ""}`,
          detail: "검색 결과 위쪽은 광고가 먼저 차지해요. 자연 순위가 낮다면 광고로 보완하는 구간이에요.",
          fix: market.myAd ? "" : "마진이 받쳐준다면 대표 키워드 쇼핑검색광고를 소액으로 시험해 보세요.",
        });
      }
      const lawText = [px.notices, ...(px.claims || [])].filter(Boolean).join("\n");
      const areas = [
        titleArea,
        exposureArea,
        priceArea,
        analyzeOffer(px),
        categoryArea,
        marginArea,
        trustArea,
        analyzeCompliance(lawText || product.text, !!px.isFood),
        adsArea,
      ].filter(Boolean);

      const season = analyzeSeason(extra.trend);
      if (!season) skipped.push("시즌 분석 (검색어 트렌드 API 키 필요)");
      if (!kwOp) skipped.push("키워드 검색량 (검색광고 API 키 필요)");

      // 🔬 검색량 표 + 데이터 과학 분석 (받아온 숫자로만 계산)
      let rankHist = [];
      try {
        rankHist = JSON.parse(localStorage.getItem("gms_rank_history") || "{}")[`${sName}|${keyword}`] || [];
      } catch {}
      if (market && keyword) rankHist = [...rankHist, { t: new Date().toISOString(), best: market.myRank }];
      const makeSci = (negatives) => scienceBundle({
        keywords: extra.allKeywords || extra.keywords,
        title: f.product,
        main: keyword,
        negatives,
        trend: extra.trend,
        my: +f.price,
        prices: market?.top?.map((x) => x.price) || [],
        shipFee: +f.shipFee || 0,
        rankHist: market && keyword ? rankHist : null,
        optionPrices: px.optionPrices,
        buyers: extra.buyers,
      });

      const sci0 = makeSci(extra.dropped || []);
      const summary = {
        카테고리: categoryArea ? { 내카테고리: categoryArea.cat.my || "모름", 검색상위카테고리: categoryArea.cat.top.slice(0, 3).map((t) => `${t.path} ${t.share}%`), 판정: { same: "같음", parent: "큰 분류만 같음", diff: "다름", unknown: "내 카테고리 모름" }[categoryArea.cat.match] } : null,
        옵션가격: optPrice ? { 대표가격: +f.price, 실제최저구성가: optPrice.stats.minEff, 가장싼구성: optPrice.stats.cheapest, 최고구성가: optPrice.stats.maxEff, 옵션수: optPrice.stats.count, 품절옵션수: optPrice.stats.soldOut } : null,
        상품: { 상품명: f.product, 판매가: +f.price, 배송비: f.shipFee, 리뷰: f.reviews, 평점: f.rating, 혜택: px.benefits, 옵션: px.options, 리뷰불만: px.reviewIssues, 리뷰칭찬: px.reviewPraise },
        점수: areas.map((a) => ({ 항목: a.label, 점수: `${a.score}/${a.max}`, 발견: a.findings.filter((x) => x.level !== "good").map((x) => `${x.title} — ${x.detail}`) })),
        검색: market ? { 키워드: keyword, 화면에서본상품수: market.scanned, 내자연순위: market.myRank || "화면 안에 없음", 광고수: market.adCount } : "검색 결과 화면 없음",
        가격: priceArea?.stats ? { 중앙값: Math.round(priceArea.stats.med), 비싼비율: Math.round(priceArea.stats.below * 100) + "%" } : null,
        마진: marginArea?.margin ? { 주문당이익: Math.round(marginArea.margin.profit), 마진율: Math.round(marginArea.margin.rate * 100) + "%" } : null,
        키워드: kwOp ? { 대표키워드검색량: kwOp.mainVolume, 경쟁: kwOp.mainComp, 상품명에없는검색어: kwOp.missing.slice(0, 5).map((k) => `${k.keyword}(${k.volume})`), 경쟁낮은키워드: kwOp.golden.slice(0, 5).map((k) => `${k.keyword}(${k.volume},${k.comp})`) } : null,
        구매자: sci0.buyers ? { 주고객: sci0.buyers.main, 주고객비율: `${sci0.buyers.mainShare}%`, 연령별: sci0.buyers.ages.map((a) => `${a.label} ${a.share}%`), 여성: sci0.buyers.female, 남성: sci0.buyers.male, 모바일: sci0.buyers.mobile, 출처: "네이버 쇼핑인사이트 최근 1년 클릭" } : "연령·성별 데이터 없음",
        시장흐름: sci0.long ? { 최근1년_전년대비: `${sci0.long.yoy}%`, 장기변화: sci0.long.total != null ? `${sci0.long.fromYear}→${sci0.long.toYear} ${sci0.long.total}%` : null } : null,
        카테고리시즌: sci0.catWave ? { 카테고리클릭정점: `${sci0.catWave.peak}월`, 상승시작: `${sci0.catWave.rise}월` } : null,
        데이터분석: {
          대표키워드월검색량: sci0.mainRow?.volume ?? null,
          관련키워드검색합계: sci0.coverage?.total ?? null,
          상품명검색커버율: sci0.coverage ? `${sci0.coverage.pct}%` : null,
          상품명에없는큰검색어: sci0.coverage?.missing?.map((m) => `${m.keyword}(${m.volume})`) || [],
          모바일비중: sci0.mobile != null ? `${sci0.mobile}%` : null,
          롱테일: sci0.power ? `상위20% 키워드가 검색량 ${sci0.power.top20Share}% · 경쟁 낮은 작은 키워드 ${sci0.power.tailCount}개 합계 ${sci0.power.tailVolume}회` : null,
          틈새키워드: sci0.niche?.slice(0, 3).map((x) => x.keyword) || [],
          검색파동: sci0.wave ? `정점 ${sci0.wave.peak}월, 상승 시작 ${sci0.wave.rise}월, 지금 ${sci0.wave.phase}` : null,
          가격백분위: sci0.price ? `경쟁 ${sci0.price.n}개 중 ${sci0.price.pct}%보다 비쌈(${sci0.price.zone})` : null,
        },
        시즌: season ? { 성수기: season.peaks.map((m) => `${m}월`), 다가오는성수기: season.upcoming ? `${season.upcoming}월` : "없음" } : null,
      };

      const imgs = (product.imgs || []).slice(0, 8);
      setBusy(imgs.length ? "AI가 상세페이지 이미지를 보고 분석 보고서를 쓰는 중… (30~60초)" : "AI가 분석 보고서를 쓰는 중… (20~40초)");
      // 경쟁 비교표: 상위 5개 + 내 상품
      const competitors = market
        ? [...market.top.slice(0, 5), ...(market.myRank > 5 ? market.mine.slice(0, 1) : [])].map((x) => ({ rank: x.rank, title: x.title, price: x.price, mall: x.mall, reviews: x.reviews, me: market.myRank === x.rank }))
        : [];
      const storeForAI = { ...store, name: sName };
      // 광고 제안용 데이터: 키워드 검색량·경쟁 + 예상 입찰가 + 월 예상 성과
      const norm2 = (k) => String(k || "").replace(/\s+/g, "");
      const bidMap = Object.fromEntries((extra.adEstimates?.bids || []).map((b) => [norm2(b.keyword), b]));
      const adRows = (extra.keywords || []).map((k) => ({ keyword: k.keyword, volume: k.volume, comp: k.comp, ctr: k.ctr, depth: k.depth, bid3: bidMap[norm2(k.keyword)]?.bid3 || 0, bid5: bidMap[norm2(k.keyword)]?.bid5 || 0 }));
      const profitNoAd = marginArea?.margin?.profitNoAd || null;
      const adForAI = adRows.length
        ? {
            키워드: adRows.slice(0, 25).map((r) => ({ 키워드: r.keyword, 월검색량: r.volume, 경쟁: r.comp, 모바일클릭률: r.ctr, 평균광고수: r.depth, 예상입찰가_3위: r.bid3 || null, 예상입찰가_5위: r.bid5 || null })),
            월예상성과: extra.adEstimates?.perf || null,
            주문당이익_광고비제외: profitNoAd,
          }
        : null;
      const productInfo = { 판매가: +f.price, 배송비: f.shipFee, 리뷰: f.reviews, 평점: f.rating, 옵션: px.options, 혜택: px.benefits, 표시: px.badges, 주장문구: px.claims, 표기: px.notices, 리뷰불만: px.reviewIssues, 리뷰칭찬: px.reviewPraise, 식품: px.isFood };
      // 상세페이지 글자: '상세정보' 다음 부분 (없으면 화면 글자 중간) — 이미지가 없어도 상세페이지를 평가하도록
      const pageText = String(product.text || "");
      const dIdx = pageText.search(/상세정보|상품정보|상세 정보|상품 상세/);
      const detailText = (dIdx >= 0 ? pageText.slice(dIdx, dIdx + 6000) : pageText.slice(2000, 8000)).trim();
      const reviewsForAI = { 칭찬: px.reviewPraise || [], 불만: px.reviewIssues || [], 불만원문: (px.reviewNegatives || []).map((x) => x.q), 리뷰글: (product.revs || []).slice(0, 25).map((v) => `[${v.s ?? "?"}점] ${v.x.slice(0, 120)}`) };
      const [mainRes, plusRes, buyerRes] = await Promise.allSettled([
        callAI("diagnose", storeForAI, { productName: f.product, keyword, summary, hasImages: imgs.length > 0, detailText }, [], imgs),
        callAI("diagnose_plus", storeForAI, { productName: f.product, keyword, summary, product: productInfo, competitors, agency: agency.name, ad: adForAI }),
        // 구매자 분석: 누가 사는지 → 상세페이지가 그 사람에게 맞는지 → 후기와 상세페이지가 같은 말을 하는지
        callAI("buyer", storeForAI, { productName: f.product, keyword, category: f.category || px.category, buyers: sci0.buyers, product: productInfo, reviews: reviewsForAI, detailText, hasImages: imgs.length > 0, competitors: (competitors || []).slice(0, 8) }, [], imgs.slice(0, 8)),
      ]);
      let ai = {};
      if (mainRes.status === "fulfilled") {
        ai = mainRes.value.data || {};
        if (mainRes.value.imageNote) skipped.push(mainRes.value.imageNote);
      } else skipped.push(`AI 요약 실패 — 점수·근거만 표시 (${mainRes.reason?.message})`);
      const plus = plusRes.status === "fulfilled" ? plusRes.value.data || {} : {};
      const buyerAI = buyerRes.status === "fulfilled" ? buyerRes.value.data || null : null;
      if (buyerRes.status === "rejected") skipped.push(`구매자·상세페이지 적합성 분석 실패 — 다시 분석하면 채워져요 (${buyerRes.reason?.message})`);
      if (plusRes.status === "rejected") skipped.push(`상세 분석 실패 — 다시 분석하면 채워져요 (${plusRes.reason?.message})`);
      // AI가 '상품과 무관'으로 분류한 키워드는 상품명 추천에서도 뺌
      const neg = new Set((plus.adPlan?.negatives || []).map((k) => String(k).replace(/\s+/g, "")));
      if (titleArea && kwOp && neg.size) {
        const i = titleArea.findings.findIndex((x) => x.title.startsWith("검색량 많은 연관 키워드"));
        if (i >= 0) {
          const keep = kwOp.missing.filter((k) => !neg.has(k.keyword.replace(/\s+/g, "")));
          if (keep.length) {
            titleArea.findings[i] = { ...titleArea.findings[i], title: `검색량 많은 연관 키워드 ${keep.length}개가 상품명에 없어요`, detail: keep.slice(0, 6).map((k) => `${k.keyword}(${k.volume.toLocaleString()})`).join(", ") };
          } else titleArea.findings.splice(i, 1);
        }
      }
      if (ai.detail?.findings?.length) {
        areas.splice(3, 0, { key: "detail", label: imgs.length ? "상세페이지" : "상세페이지 (글 기준)", max: 15, score: Math.max(0, Math.min(15, Math.round(Number(ai.detail.score) || 0))), findings: ai.detail.findings });
      }

      const sci = makeSci([...(plus.adPlan?.negatives || []), ...(extra.dropped || [])]);

      const score = totalScore(areas);
      // 저장 파일 이름: 업체_상품_진단_날짜_점수(지난번 대비)_핵심문제
      const nameKey = keyword || shortProduct(f.product, sName);
      const prev = previousScore(sName, nameKey);
      recordScore(sName, nameKey, score);
      const tag = cleanName(ai.tag || "", 8);
      const result = {
        tag,
        fileBase: fileName({ store: sName, product: nameKey, kind: "분석", date: yymmdd(), score, delta: prev != null ? score - prev : 0, tag }),
        v: 2,
        agency: agency.name,
        contact: agency.contact,
        store: sName,
        product: f.product,
        keyword,
        date: `${new Date().toLocaleDateString("ko-KR")} ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        id: Date.now(),
        at: new Date().toISOString(),
        score,
        grade: grade(score),
        headline: ai.headline || "",
        summary: ai.summary || "",
        top3: (ai.top3 || []).slice(0, 3),
        hidden: (ai.hidden || []).slice(0, 3),
        areas: areas.map(({ key, label, max, score, findings }) => ({ key, label, max, score, findings, note: plus.areaNotes?.[key] || "" })),
        letter: plus.letter || "",
        offerIdeas: (plus.offerIdeas || []).slice(0, 5),
        ad: plus.adPlan
          ? {
              plan: plus.adPlan,
              rows: adRows.slice(0, 40),
              perf: extra.adEstimates?.perf || [],
              hasData: adRows.length > 0,
              // 클릭당 얼마까지 써도 손해가 아닌지 (구매 전환율 가정별 예시)
              maxCpc: profitNoAd ? [2, 3, 5].map((c) => ({ conv: c, cpc: Math.floor((profitNoAd * c) / 100 / 10) * 10 })) : null,
            }
          : null,
        strengths: (plus.strengths || []).slice(0, 4),
        scope: {
          images: imgs.length,
          competitors: market?.scanned || 0,
          ads: market?.adCount || 0,
          keywords: extra.keywords?.length || 0,
          trendMonths: extra.trend?.length || 0,
          reviewSignals: (px.reviewIssues?.length || 0) + (px.reviewPraise?.length || 0),
          claims: px.claims?.length || 0,
          checks: areas.reduce((n, a) => n + a.findings.length, 0),
          areas: areas.length,
        },
        journey: (plus.journey || []).slice(0, 4),
        competitors,
        currentTitle: f.product,
        titleOptions: (plus.titleOptions || []).slice(0, 3),
        detailPlan: (plus.detailPlan?.length ? plus.detailPlan : basicDetailPlan(f.product, px)).slice(0, 8),
        buyer: buyerAI ? { ...buyerAI, hasDetail: imgs.length > 0 || detailText.length > 300 } : null,
        detailBasis: imgs.length ? `상세 이미지 ${imgs.length}장` : "상세페이지 글자",
        reviewReplies: (plus.reviewReplies || []).slice(0, 3),
        reviews: {
          issues: px.reviewIssues || [],
          praise: px.reviewPraise || [],
          // 불만 리뷰 원문: AI가 고른 것 → 없으면 별점 3점 이하 리뷰 그대로
          negatives: (px.reviewNegatives?.length ? px.reviewNegatives : (product.revs || []).filter((v) => v.s != null && v.s <= 3).map((v) => ({ q: v.x.replace(/평점\s*\d|별점\s*\d|★\s*\d/g, "").replace(/\S*\*{2,}\S*/g, "").replace(/\d{2}\.\d{1,2}\.\d{1,2}\.?/g, "").replace(/옵션\s*:\s*\S+(\s\S+)?/, "").replace(/\s+/g, " ").trim().slice(0, 80), s: v.s })))
            .slice(0, 5),
          scanned: (product.revs || []).length || Number(px.reviewScanned) || 0,
        },
        category: categoryArea?.cat || null,
        roadmap: plus.roadmap || null,
        offer: (plus.offer || []).slice(0, 4),
        price: priceArea?.stats ? { prices: priceArea.stats.prices, my: +f.price, med: Math.round(priceArea.stats.med), minEff: optPrice?.stats.minEff < +f.price ? optPrice.stats.minEff : null } : null,
        golden: kwOp?.golden?.length ? kwOp.golden.map(({ keyword, volume, comp }) => ({ keyword, volume, comp })) : null,
        season,
        sci,
        myRank: market?.myRank || null,
        ads: adsArea?.ads ? { waste: adsArea.ads.waste.slice(0, 8).map(({ keyword, clk, cost }) => ({ keyword, clk, cost })), wasteCost: adsArea.ads.wasteCost, ratio: adsArea.ads.ratio, roas: adsArea.ads.roas } : null,
      };
      result.notes = [...skipped, ...(extra.notes || [])];
      setDiag(result);
      setHist((h) => [result, ...(Array.isArray(h) ? h : []).filter((x) => x.id !== result.id)].slice(0, 5));
      setNotes([...skipped, ...(extra.notes || [])]);

      // 순위는 고객 리포트용 기록에도 남김
      if (market && keyword) {
        try {
          const hist = JSON.parse(localStorage.getItem("gms_rank_history") || "{}");
          const k = `${sName}|${keyword}`;
          hist[k] = [...(hist[k] || []), { t: new Date().toISOString(), best: market.myRank, count: market.mine.length }].slice(-60);
          localStorage.setItem("gms_rank_history", JSON.stringify(hist));
        } catch {}
      }
      logWork(sName, "상담", `페이지 분석 (${keyword || f.product.slice(0, 15)}, ${score}점)`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2200);
  };
  const [shareUrl, setShareUrl] = useState("");
  // 예전 진단 결과(이름 기능 전)는 그 자리에서 이름을 만들어 줌
  const diagFile = diag ? diag.fileBase ?? fileName({ store: diag.store || sName, product: diag.keyword || shortProduct(diag.product, diag.store), kind: "분석", score: diag.score, tag: diag.tag }) : "";
  const [sharing, setSharing] = useState(false);
  useEffect(() => setShareUrl(diag?._share || ""), [diag]);
  const share = async () => {
    // 같은 진단서는 한 번 만든 링크를 다시 씀
    if (diag._share) {
      copyText(diag._share);
      return flash("링크 복사됨");
    }
    setSharing(true);
    const { _share, ...data } = diag;
    const r = await makeShareLink("d", data, () => encodeReport(data));
    setSharing(false);
    if (r.short) putDiag({ ...diag, _share: r.url });
    setShareUrl(r.url);
    copyText(r.url);
    flash(r.short ? "짧은 링크 복사됨" : r.reason === "no-kv" ? "긴 링크 복사됨 (짧은 링크는 Vercel 저장소 연결 후 가능)" : `긴 링크 복사됨 (${r.reason})`);
  };

  const reset = () => {
    clearImport("product");
    setImports({ ...clearImport("search") });
    setF(EMPTY);
    setDiag(null);
    setNotes([]);
    setAd(null);
    setAdName("");
  };

  const installed = useMemo(() => {
    try {
      return localStorage.getItem("gms_bm_ok") === "1";
    } catch {
      return false;
    }
  }, []);

  return (
    <>
      <div className="panel">
        <h2>🔍 페이지 분석</h2>
        <p className="hint">업체 스토어를 열고 버튼 한 번만 누르면, 손님이 보는 화면 그대로 가져와서 분석 보고서를 만들어요. 업체에 따로 받을 건 없어요.</p>

        <details className="bm-box" open={!installed}>
          <summary>처음 한 번: '고운 진단' 버튼 설치 (PC 크롬)</summary>
          <ol>
            <li>
              크롬 북마크바가 안 보이면 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
            </li>
            <li>
              아래 주황 버튼을 <b>마우스로 끌어서 북마크바에 놓기</b>
              <div style={{ margin: "10px 0" }}>
                <a ref={bmRef} className="bm-btn" onClick={(e) => (e.preventDefault(), alert("클릭이 아니라 북마크바로 끌어다 놓으세요."))} onDragEnd={() => { try { localStorage.setItem("gms_bm_ok", "1"); } catch {} }}>
                  🔍 고운 진단
                </a>
              </div>
            </li>
            <li>끌어다 놓기가 안 되면: 북마크바 우클릭 → 페이지 추가 → 이름 '고운 진단', URL에 아래 코드 붙여넣기</li>
          </ol>
          <button className="btn small" onClick={() => (copyText(bm), flash("버튼 코드 복사됨"))}>버튼 코드 복사</button>
          {msg && <span className="okmsg" style={{ marginLeft: 8 }}>{msg}</span>}
        </details>
      </div>

      <div className="panel">
        <h2>① 화면 가져오기</h2>
        <div className="imp-row">
          <span className={`imp-dot ${px ? "on" : product ? "wait" : ""}`}>1</span>
          <div style={{ flex: 1 }}>
            <b>업체 상품 페이지</b> <span className="hint">(필수)</span>
            {px ? (
              <div className="hint" style={{ margin: 0 }}>
                ✓ {px.storeName} · {String(px.productName || "").slice(0, 40)} · {when(product.at)}
              </div>
            ) : product ? (
              <div className="hint" style={{ margin: 0 }}>가져옴 · 읽는 중…</div>
            ) : (
              <div className="hint" style={{ margin: 0 }}>스마트스토어 상품 페이지를 열고 북마크바의 <b>🔍 고운 진단</b>을 누르세요. 상세정보를 펼치고 아래까지 내린 뒤 누르면 상세페이지까지 분석돼요.</div>
            )}
          </div>
        </div>
        <div className="imp-row">
          <span className={`imp-dot ${sx ? "on" : search ? "wait" : ""}`}>2</span>
          <div style={{ flex: 1 }}>
            <b>네이버 쇼핑 검색 결과</b> <span className="hint">(선택 · 순위·경쟁 가격 비교)</span>
            {sx ? (
              <div className="hint" style={{ margin: 0 }}>
                ✓ '{sx.keyword}' 검색 결과 상품 {sx.items?.length || 0}개 · {when(search.at)} · <span title={search.url}>{(search.url || "").replace(/^https?:\/\//, "").slice(0, 40)}</span>
                <SearchPreview sx={sx} storeName={f.storeName || store.name} />
              </div>
            ) : search && !badSearch ? (
              <div className="hint" style={{ margin: 0 }}>가져옴 · 읽는 중…</div>
            ) : (
              <div className="hint" style={{ margin: 0 }}>
                {badSearch && <b style={{ color: "var(--danger)" }}>이전에 가져온 화면은 스토어 안 목록이라 제외했어요. </b>}
                네이버쇼핑에서 대표 키워드로 검색한 화면에서 버튼을 누르세요.{" "}
                {searchUrl && (
                  <a href={searchUrl} target="_blank" rel="noreferrer">
                    '{f.keyword}' 검색 열기 ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        {busy && <Loading text={busy} />}
        {err && (
          <div className="error">
            {err}
            {((product && !px) || (search && !sx)) && (
              <div style={{ marginTop: 8 }}>
                <button className="btn small" onClick={retry}>다시 읽기</button>
              </div>
            )}
          </div>
        )}
      </div>

      {px && (
        <div className="panel">
          <h2>② 확인 · 진단</h2>
          <p className="hint">화면에서 읽은 값이에요. 틀린 게 있으면 고치세요.</p>
          <div className="grid2">
            <label className="field">
              <span>스토어명</span>
              <input type="text" value={f.storeName} onChange={set("storeName")} />
            </label>
            <label className="field">
              <span>대표 키워드</span>
              <input type="text" value={f.keyword} onChange={set("keyword")} />
            </label>
          </div>
          <label className="field">
            <span>상품명</span>
            <input type="text" value={f.product} onChange={set("product")} />
          </label>
          <div className="grid4">
            {[
              ["price", "판매가"],
              ["shipFee", "배송비"],
              ["reviews", "리뷰 수"],
              ["rating", "평점"],
            ].map(([k, l]) => (
              <label className="field" key={k}>
                <span>{l}</span>
                <input type="text" inputMode="decimal" value={f[k]} onChange={set(k)} />
              </label>
            ))}
          </div>

          <button className="btn small" style={{ margin: "4px 0 8px" }} onClick={() => setShowMore(!showMore)}>
            {showMore ? "▲" : "▼"} 업체에게 들은 정보가 있으면 (원가·광고 보고서 · 선택)
          </button>
          {showMore && (
            <>
              <div className="grid4">
                {[
                  ["cost", "원가 (1개)"],
                  ["courier", "택배·포장비"],
                  ["feeRate", "수수료 %"],
                  ["adPerOrder", "주문당 광고비"],
                ].map(([k, l]) => (
                  <label className="field" key={k}>
                    <span>{l}</span>
                    <input type="text" inputMode="decimal" value={f[k]} onChange={set(k)} />
                  </label>
                ))}
              </div>
              <label className="field">
                <span>세부 키워드 (쉼표)</span>
                <input type="text" value={f.subs} onChange={set("subs")} />
              </label>
              <div className="row">
                <label className="btn small">
                  검색광고 보고서 CSV
                  <input type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => addCsv(e.target.files[0])} />
                </label>
                <span className="hint" style={{ margin: 0 }}>{adName}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <input type="text" value={agency.name} onChange={(e) => setAgency({ ...agency, name: e.target.value })} placeholder="대행사명" style={{ flex: 1 }} />
                <input type="text" value={agency.contact} onChange={(e) => setAgency({ ...agency, contact: e.target.value })} placeholder="연락처 (진단서 하단)" style={{ flex: 1 }} />
              </div>
            </>
          )}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={run} disabled={!!busy}>
              {diag ? "🔄 새로 분석하기" : "🔍 분석 시작"}
            </button>
            <button className="btn" onClick={reset} disabled={!!busy}>새 업체</button>
            {diag?.at && (
              <span className="hint" style={{ margin: 0 }}>
                지금 보는 분석: <b>{stamp(diag.at)}</b> ({ago(diag.at)}) · 버튼을 누르면 지금 가져온 화면으로 새 분석을 만들고, 이전 분석은 아래 탭에 남아요
              </span>
            )}
          </div>
          {(diag?.notes || notes).length > 0 && (
            <div className="hint" style={{ marginTop: 10 }}>
              <b>{diag?.at ? `${stamp(diag.at)} 분석에서 건너뛴 것` : "이번 분석에서 건너뛴 것"}</b>
              {(diag?.notes || notes).map((n, i) => (
                <div key={i}>· {n}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {diag && (
        <div className="panel">
          {Array.isArray(hist) && hist.length > 0 && (
            <div className="hist-tabs" role="tablist" aria-label="최근 분석">
              {hist.map((h, i) => (
                <button key={h.id} role="tab" aria-selected={h.id === diag.id} className={h.id === diag.id ? "on" : ""} onClick={() => setDiag(h)}>
                  <b>
                    {i === 0 && <i>최신</i>}
                    {h.store || "업체"} · {h.keyword || shortProduct(h.product, h.store) || "상품"}
                  </b>
                  <span>
                    {h.at ? stamp(h.at) : h.date} · {h.score}점
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>페이지 분석 미리보기</h2>
            <div className="row">
              <button className="btn primary" onClick={share} disabled={sharing}>{sharing ? "링크 만드는 중…" : "🔗 고객용 링크 복사"}</button>
              <ExportButtons title={`${diag.store || sName} 페이지 분석`} fileBase={diagFile} getBody={() => viewRef.current?.innerHTML} />
              {msg && <span className="okmsg">{msg}</span>}
            </div>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 6, alignItems: "center" }}>
            <span className="hint" style={{ margin: 0, padding: 0, background: "none", whiteSpace: "nowrap" }}>💾 저장 이름</span>
            <input type="text" value={diagFile} onChange={(e) => putDiag({ ...diag, fileBase: e.target.value })} style={{ flex: 1, minWidth: 0 }} title="PDF·HTML 저장 때 이 이름으로 저장돼요. 고쳐 써도 됩니다" />
          </div>
          {!diag.competitors?.length && (
            <div className="error" style={{ marginTop: 8 }}>
              🥊 <b>광고 제외 순위·경쟁 상품 비교가 이번 분석에 빠졌어요.</b> 네이버쇼핑 검색 결과 화면을 가져오지 않았거나, 가져온 화면이 스토어 안 목록이라 제외됐어요.
              {"\n"}→ shopping.naver.com에서 대표 키워드로 검색 → 결과 목록이 보이면 '고운 진단' 버튼 → 위 ② 칸 미리보기 확인 → 🔄 새로 분석하기
            </div>
          )}
          {shareUrl && (
            <input className="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          )}
          <div className="report-frame" ref={viewRef}>
            <DiagnoseView diag={diag} />
          </div>
        </div>
      )}
    </>
  );
}
