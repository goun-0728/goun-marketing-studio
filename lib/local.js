// 오프라인 가게 데이터 정리 (화면·AI 공용)
import { analyzeBuzz, buzzForAI } from "./buzz";
import { longTrend, wave } from "./science";

export function localBundle(d) {
  if (!d) return null;
  const comps = (d.competitors || []).filter((c) => c.blog != null);
  const all = [...comps.map((c) => c.blog), d.myBlog].filter((x) => x != null);
  const rank = d.myBlog != null ? [...all].sort((a, b) => b - a).indexOf(d.myBlog) + 1 : null;
  const avg = comps.length ? Math.round(comps.reduce((a, c) => a + c.blog, 0) / comps.length) : null;
  const buzz = analyzeBuzz(d.blogArea);
  return {
    query: d.query,
    town: d.town,
    me: d.me,
    myBlog: d.myBlog,
    myRecent90: d.myRecent90,
    myRecentSample: d.myRecentSample || [],
    competitors: d.competitors || [],
    blogRank: rank,
    blogOf: all.length,
    compAvg: avg,
    buzz,
    keywords: (d.keywords || []).slice(0, 15),
    season: d.trend?.length >= 12 ? wave(d.trend) : null,
    long: longTrend(d.trend),
    notes: d.notes || [],
  };
}

export function localForAI(b) {
  if (!b) return null;
  return {
    검색어: b.query,
    내가게: b.me ? { 이름: b.me.name, 분류: b.me.category, 주소: b.me.address } : "지역 검색에서 못 찾음 (플레이스 등록·이름 확인 필요)",
    내가게_블로그언급수: b.myBlog,
    내가게_최근3개월블로그글: b.myRecent90,
    블로그언급순위: b.blogRank ? `${b.blogOf}곳 중 ${b.blogRank}위` : null,
    경쟁가게_평균블로그언급: b.compAvg,
    주변경쟁가게: b.competitors.map((c) => ({ 이름: c.name, 분류: c.category, 블로그언급: c.blog, 리뷰많은순위: c.reviewRank })),
    지역키워드_월검색량: b.keywords.slice(0, 25).map((k) => `${k.keyword} ${k.volume}`),
    지역블로그_상위글패턴: buzzForAI(b.buzz),
    시즌: b.season ? { 가장많이찾는달: `${b.season.peak}월`, 가장적은달: `${b.season.trough}월`, 오르기시작: `${b.season.rise}월` } : null,
    최근1년_전년대비: b.long?.yoy != null ? `${b.long.yoy}%` : null,
  };
}
