// 서버 전용: 아직 살아 있는 네이버 공식 API (둘 다 선택 사항 — 키 없으면 해당 분석만 건너뜀)
// ※ 개발자센터 '쇼핑 검색 API'는 2026-07-31 종료 → 사용하지 않음
import crypto from "node:crypto";

// 1) 검색어 트렌드 — 네이버클라우드 NAVER API HUB (구 데이터랩)
export function hasTrendApi() {
  return !!(process.env.NCP_HUB_CLIENT_ID && process.env.NCP_HUB_CLIENT_SECRET);
}

export async function searchTrend(keyword) {
  const end = new Date();
  // 5년치: 시즌뿐 아니라 '해마다 커지는 시장인지 줄어드는 시장인지'까지 보기 위해
  const start = new Date(end.getFullYear() - 5, end.getMonth(), 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r = await fetch("https://naverapihub.apigw.ntruss.com/search-trend/v1/search", {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": process.env.NCP_HUB_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": process.env.NCP_HUB_CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: fmt(start),
      endDate: fmt(end),
      timeUnit: "month",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.errorMessage || data.error?.message || `검색어 트렌드 오류 (${r.status})`);
  return (data.results?.[0]?.data || []).map((d) => ({ period: d.period.slice(0, 7), ratio: d.ratio }));
}

// 1-2) 쇼핑인사이트 — 이 키워드로 쇼핑 검색을 하는 사람의 연령·성별 비율 (NAVER API HUB, 같은 키 사용)
// category: 네이버쇼핑 카테고리 코드(cat_id). 세부 카테고리에 데이터가 없으면 상위 카테고리로 다시 시도
async function insight(path, category, keyword) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r = await fetch(`https://naverapihub.apigw.ntruss.com/shopping/v1/category/keyword/${path}`, {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": process.env.NCP_HUB_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": process.env.NCP_HUB_CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), timeUnit: "month", category: String(category), keyword }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.errorMessage || data.error?.message || `쇼핑인사이트 오류 (${r.status})`);
  // 기간별 비율을 그룹(연령/성별)마다 더해서 전체 중 몇 %인지로 바꿈
  const sum = {};
  for (const d of data.results?.[0]?.data || []) sum[d.group] = (sum[d.group] || 0) + (Number(d.ratio) || 0);
  const total = Object.values(sum).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return Object.entries(sum).map(([group, v]) => ({ group, share: Math.round((v / total) * 1000) / 10 })).sort((a, b) => b.share - a.share);
}

// 카테고리 전체의 월별 클릭 흐름 (최근 2년) — 이 카테고리가 언제 뜨는지
async function categoryTrend(category) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 2, end.getMonth(), 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r = await fetch("https://naverapihub.apigw.ntruss.com/shopping/v1/categories", {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": process.env.NCP_HUB_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": process.env.NCP_HUB_CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), timeUnit: "month", category: [{ name: "c", param: [String(category)] }] }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return null;
  return (data.results?.[0]?.data || []).map((d) => ({ period: d.period.slice(0, 7), ratio: d.ratio }));
}

export async function shoppingInsight(categories, keyword) {
  let lastErr = null;
  for (const cat of categories) {
    try {
      const [ages, gender, device, catTrend] = await Promise.all([
        insight("age", cat, keyword),
        insight("gender", cat, keyword),
        insight("device", cat, keyword).catch(() => null),
        categoryTrend(cat).catch(() => null),
      ]);
      if (ages?.length || gender?.length) return { category: String(cat), ages: ages || [], gender: gender || [], device: device || [], catTrend: catTrend || [] };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

// 1-3) 네이버 검색 (블로그·지식iN·카페) — 지금 네이버에서 위에 보이는 글 (조회수는 제공 안 됨)
const strip = (t) => String(t || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();
export async function naverSearch(type, query, display = 30, sort = "sim") {
  const url = `https://naverapihub.apigw.ntruss.com/search/v1/${type}?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
  const r = await fetch(url, {
    headers: { "X-NCP-APIGW-API-KEY-ID": process.env.NCP_HUB_CLIENT_ID, "X-NCP-APIGW-API-KEY": process.env.NCP_HUB_CLIENT_SECRET },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.errorMessage || data.error?.message || `${type} 검색 오류 (${r.status})`);
  return {
    total: Number(data.total) || 0,
    items: (data.items || []).map((x) => ({
      title: strip(x.title),
      desc: strip(x.description),
      name: strip(x.bloggername || x.cafename || ""),
      date: x.postdate ? `${x.postdate.slice(0, 4)}-${x.postdate.slice(4, 6)}-${x.postdate.slice(6, 8)}` : "",
      link: x.link || "",
    })),
  };
}

// 2) 검색광고 API 키워드도구 — 월간 검색량·경쟁 정도·연관 키워드
export function hasAdApi() {
  return !!(process.env.NAVER_AD_API_KEY && process.env.NAVER_AD_SECRET && process.env.NAVER_AD_CUSTOMER_ID);
}

const vol = (v) => (typeof v === "number" ? v : String(v).includes("<") ? 5 : Number(v) || 0);

// 검색광고 API 공통 서명 호출
async function adCall(method, uri, { query = "", body } = {}) {
  const ts = String(Date.now());
  const sig = crypto.createHmac("sha256", process.env.NAVER_AD_SECRET).update(`${ts}.${method}.${uri}`).digest("base64");
  const r = await fetch(`${process.env.NAVER_AD_BASE || "https://api.searchad.naver.com"}${uri}${query}`, {
    method,
    headers: {
      "X-Timestamp": ts,
      "X-API-KEY": process.env.NAVER_AD_API_KEY,
      "X-Customer": process.env.NAVER_AD_CUSTOMER_ID,
      "X-Signature": sig,
      ...(body ? { "Content-Type": "application/json; charset=UTF-8" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.title || data.message || `검색광고 API 오류 (${r.status})`);
  return data;
}

export async function keywordTool(hints) {
  const q = hints
    .slice(0, 5)
    .map((h) => h.replace(/\s+/g, ""))
    .join(",");
  const data = await adCall("GET", "/keywordstool", { query: `?hintKeywords=${encodeURIComponent(q)}&showDetail=1` });
  return (data.keywordList || []).map((k) => ({
    keyword: k.relKeyword,
    volume: vol(k.monthlyPcQcCnt) + vol(k.monthlyMobileQcCnt),
    pc: vol(k.monthlyPcQcCnt),
    mobile: vol(k.monthlyMobileQcCnt),
    low: String(k.monthlyPcQcCnt).includes("<") || String(k.monthlyMobileQcCnt).includes("<"), // 네이버가 '10 미만'으로만 알려준 값
    mobileShare: vol(k.monthlyMobileQcCnt) / Math.max(1, vol(k.monthlyPcQcCnt) + vol(k.monthlyMobileQcCnt)),
    comp: k.compIdx || "",
    ctr: Number(k.monthlyAveMobileCtr) || 0,
    clicks: (Number(k.monthlyAvePcClkCnt) || 0) + (Number(k.monthlyAveMobileClkCnt) || 0),
    depth: Number(k.plAvgDepth) || 0, // 파워링크 평균 노출 광고 수
  }));
}

// 파워링크 평균 순위별 예상 입찰가 (모바일). position 기본 3위
export async function bidEstimate(keywords, position = 3, device = "MOBILE") {
  const data = await adCall("POST", "/estimate/average-position-bid/keyword", {
    body: { device, items: keywords.slice(0, 50).map((key) => ({ key, position })) },
  });
  const out = {};
  for (const e of data.estimate || []) out[e.keyword || e.key] = Number(e.bid) || 0;
  return out;
}

// 입찰가별 월 예상 노출·클릭·비용 (모바일)
export async function performanceEstimate(keyword, bids, device = "MOBILE") {
  const data = await adCall("POST", "/estimate/performance/keyword", {
    body: { device, keywordplus: false, key: keyword, bids: bids.filter((b) => b > 0).slice(0, 5) },
  });
  return (data.estimate || []).map((e) => ({ bid: Number(e.bid) || 0, impressions: Number(e.impressions) || 0, clicks: Number(e.clicks) || 0, cost: Number(e.cost) || 0 }));
}
