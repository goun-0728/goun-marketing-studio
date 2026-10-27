import { checkAuth } from "@/lib/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { bidEstimate, hasAdApi, hasTrendApi, keywordTool, performanceEstimate, searchTrend, shoppingInsight } from "@/lib/naver";

export const maxDuration = 45;

// 진단 보조 데이터: 시즌(검색어 트렌드) + 키워드 검색량(검색광고). 둘 다 키가 없으면 조용히 건너뜀.
export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  const limited = rateLimit(req, "diag", 30);
  if (limited) return limited;

  const { keywords = [], categoryIds = [] } = await req.json().catch(() => ({}));
  const kws = [...new Set(keywords.map((k) => String(k).trim()).filter(Boolean))].slice(0, 5);
  if (!kws.length) return Response.json({ trend: null, keywords: null, notes: [] });

  const notes = [];
  let trend = null;
  let buyers = null; // 쇼핑인사이트: 연령·성별 비율
  if (hasTrendApi()) {
    const cats = [...new Set(categoryIds.map(String).filter((c) => /^\d{6,}$/.test(c)))].slice(0, 4);
    const [t, b] = await Promise.allSettled([
      searchTrend(kws[0]),
      cats.length ? shoppingInsight(cats, kws[0]) : Promise.resolve(null),
    ]);
    if (t.status === "fulfilled") trend = t.value;
    else notes.push(`시즌 분석 생략: ${t.reason?.message}`);
    if (b.status === "fulfilled") buyers = b.value;
    else notes.push(`구매자 연령·성별 분석 생략: ${b.reason?.message} (NAVER API HUB에서 '쇼핑인사이트' 이용 신청 필요)`);
    if (!cats.length) notes.push("구매자 연령·성별 분석 생략: 상품 카테고리 코드를 읽지 못했어요 ('고운 진단' 버튼을 다시 설치해 주세요)");
  }

  let keywordsData = null;
  let allKeywords = null; // 검색량 표·과학 분석용 (작은 키워드까지)
  if (hasAdApi()) {
    try {
      allKeywords = (await keywordTool(kws)).sort((a, b) => b.volume - a.volume).slice(0, 150);
      keywordsData = allKeywords.filter((k) => k.volume >= 100).slice(0, 40);
    } catch (e) {
      notes.push(`검색량 분석 생략: ${e.message}`);
    }
  }

  // 광고 제안용: 상위 키워드의 파워링크 예상 입찰가(3위·5위) + 대표 키워드 월 예상 성과 — 실패해도 진단은 계속
  let adEstimates = null;
  if (keywordsData?.length) {
    try {
      const targets = [...new Set([kws[0], ...kws.slice(1), ...keywordsData.slice(0, 15).map((k) => k.keyword)].map((k) => k.replace(/\s+/g, "")))].slice(0, 20);
      const [b3, b5] = await Promise.all([bidEstimate(targets, 3), bidEstimate(targets, 5)]);
      const bids = targets.map((k) => ({ keyword: k, bid3: b3[k] || 0, bid5: b5[k] || 0 }));
      const perf = [];
      for (const b of bids.filter((x) => x.bid5 || x.bid3).slice(0, 3)) {
        try {
          perf.push({ keyword: b.keyword, rows: await performanceEstimate(b.keyword, [...new Set([b.bid5, b.bid3])]) });
        } catch {}
      }
      adEstimates = { bids, perf };
    } catch (e) {
      notes.push(`예상 입찰가 생략: ${e.message}`);
    }
  }
  return Response.json({ trend, buyers, keywords: keywordsData, allKeywords, adEstimates, notes });
}
