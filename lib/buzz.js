// 네이버 블로그·지식iN·카페 상위 글에서 패턴 뽑기 (조회수 없음 → '위에 보이는 글' 기준)
const STOP = new Set(["그리고", "하는", "있는", "없는", "합니다", "입니다", "에서", "으로", "까지", "추천", "정말", "너무", "진짜", "이번", "오늘", "요즘"]);
const TYPES = [
  ["후기", /후기|리뷰|내돈내산|솔직|사용기|먹어|써본|구매기/],
  ["추천·순위", /추천|순위|best|베스트|top|인기/i],
  ["비교", /비교|vs|차이|어떤게|뭐가/i],
  ["방법·정보", /방법|하는법|꿀팁|팁|정리|가이드|효능|효과|보관|조리|레시피|사용법/],
  ["가격·할인", /가격|할인|최저가|세일|쿠폰|가성비/],
  ["선물", /선물|기념일|답례/],
];

function words(titles, keyword) {
  const kw = String(keyword || "").replace(/\s+/g, "");
  const count = {};
  for (const t of titles) {
    const seen = new Set();
    for (const w of String(t).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)) {
      const x = w.trim();
      if (x.length < 2 || STOP.has(x) || x === kw || kw.includes(x) || /^\d+$/.test(x) || seen.has(x)) continue;
      seen.add(x);
      count[x] = (count[x] || 0) + 1;
    }
  }
  return Object.entries(count)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w, n]) => ({ w, n }));
}

export function analyzeBuzz(data) {
  if (!data) return null;
  const blog = data.blog?.items || [];
  const titles = blog.map((x) => x.title);
  const n = titles.length || 1;
  const types = TYPES.map(([name, re]) => ({ name, n: titles.filter((t) => re.test(t)).length })).map((t) => ({ ...t, share: Math.round((t.n / n) * 100) }));
  const now = Date.now();
  const days = blog.map((x) => (x.date ? (now - new Date(x.date).getTime()) / 864e5 : null)).filter((d) => d != null);
  const recent90 = days.filter((d) => d <= 90).length;
  const avgLen = Math.round(titles.reduce((a, t) => a + t.length, 0) / n);
  const empty = types.filter((t) => t.n === 0).map((t) => t.name);
  const questions = (data.kin?.items || []).map((x) => x.title).filter(Boolean).slice(0, 10);
  return {
    keyword: data.keyword,
    at: data.at,
    blogTotal: data.blog?.total || 0,
    words: words(titles, data.keyword),
    types: types.sort((a, b) => b.n - a.n),
    empty,
    recentShare: days.length ? Math.round((recent90 / days.length) * 100) : null,
    avgLen,
    topTitles: titles.slice(0, 8),
    questions,
    cafe: (data.cafe?.items || []).slice(0, 6).map((x) => x.title),
    errors: [data.blog?.error, data.kin?.error, data.cafe?.error].filter(Boolean),
  };
}

// AI에게 넘길 요약 (원문을 베끼지 않도록 패턴만)
export function buzzForAI(b) {
  if (!b) return null;
  return {
    키워드: b.keyword,
    블로그상위글_자주쓰는단어: b.words.slice(0, 10).map((x) => `${x.w}(${x.n})`),
    블로그상위글_유형비율: b.types.filter((t) => t.n).map((t) => `${t.name} ${t.share}%`),
    아무도안쓴유형: b.empty,
    평균제목길이: b.avgLen,
    최근3개월글비율: b.recentShare != null ? `${b.recentShare}%` : null,
    지식iN_손님질문: b.questions,
    카페글제목: b.cafe,
  };
}
