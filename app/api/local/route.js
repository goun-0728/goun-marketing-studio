import { checkAuth } from "@/lib/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { hasAdApi, hasTrendApi, keywordTool, localSearch, naverSearch, searchTrend } from "@/lib/naver";

export const maxDuration = 45;

// 오프라인 가게용 데이터: 주변 경쟁 가게(지역 검색) · 블로그 언급 수 · 지역 키워드 검색량 · 시즌
export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  const limited = rateLimit(req, "local", 20);
  if (limited) return limited;
  if (!hasTrendApi()) return Response.json({ error: "NAVER API HUB 키(NCP_HUB_CLIENT_ID/SECRET)가 버셀에 없어요." }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 30);
  const area = String(b.area || "").trim().slice(0, 30);
  const biz = String(b.biz || "").trim().slice(0, 20);
  if (!area || !biz) return Response.json({ error: "지역과 업종 키워드를 넣어 주세요. (예: 수성구 / 막창)" }, { status: 400 });
  // '대구 수성구 범어동' → 검색에는 '수성구'처럼 짧은 동네 이름이 잘 맞음
  const parts = area.split(/\s+/).filter(Boolean);
  const town = parts.find((p) => /[구군시]$/.test(p) && !/광역시|특별시/.test(p)) || parts[parts.length - 1];
  const q = `${town} ${biz}`;
  const notes = [];
  const ok = (r, label) => {
    if (r.status === "fulfilled") return r.value;
    notes.push(`${label}: ${r.reason?.message}`);
    return null;
  };

  const [byReview, byMatch, mine, blogArea, blogMine, kin, trend, kw] = await Promise.allSettled([
    localSearch(q, "comment"),
    localSearch(q, "random"),
    name ? localSearch(`${town} ${name}`, "random") : Promise.resolve([]),
    naverSearch("blog", `${town} ${biz}`, 30),
    name ? naverSearch("blog", `${name} ${town}`, 30, "date") : Promise.resolve(null),
    naverSearch("kin", `${town} ${biz}`, 10),
    searchTrend(q),
    hasAdApi() ? keywordTool([`${town}${biz}`, `${town}맛집`, biz].slice(0, 3)) : Promise.resolve(null),
  ]);

  const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const me = (ok(mine, "내 가게 찾기") || []).find((x) => name && norm(x.name).includes(norm(name))) || null;
  const seen = new Set(me ? [norm(me.name)] : []);
  const comps = [];
  for (const x of [...(ok(byReview, "주변 가게(리뷰순)") || []), ...(ok(byMatch, "주변 가게") || [])]) {
    const k = norm(x.name);
    if (seen.has(k) || (name && k.includes(norm(name)))) continue;
    seen.add(k);
    comps.push({ ...x, reviewRank: (byReview.value || []).findIndex((y) => norm(y.name) === k) + 1 || null });
  }
  // 가게마다 블로그 언급 수 (이름 + 동네로 검색한 글 수)
  const counts = await Promise.allSettled([
    name ? naverSearch("blog", `${name} ${town}`, 1) : Promise.resolve({ total: 0 }),
    ...comps.slice(0, 6).map((c) => naverSearch("blog", `${c.name} ${town}`, 1)),
  ]);
  const myBlog = counts[0].status === "fulfilled" ? counts[0].value.total : null;
  comps.slice(0, 6).forEach((c, i) => {
    c.blog = counts[i + 1].status === "fulfilled" ? counts[i + 1].value.total : null;
  });

  const bm = ok(blogMine, "내 가게 블로그 글");
  const recent = bm ? bm.items.filter((x) => x.date && Date.now() - new Date(x.date).getTime() < 90 * 864e5).length : null;
  const kwRows = ok(kw, "지역 키워드 검색량");

  return Response.json({
    at: new Date().toISOString(),
    query: q,
    town,
    me,
    myBlog,
    myRecent90: recent,
    myRecentSample: bm ? bm.items.slice(0, 5).map((x) => ({ title: x.title, date: x.date })) : [],
    competitors: comps.slice(0, 6),
    blogArea: { keyword: q, at: new Date().toISOString(), blog: ok(blogArea, "지역 블로그") || { total: 0, items: [] }, kin: ok(kin, "지식iN") || { total: 0, items: [] }, cafe: { total: 0, items: [] } },
    trend: ok(trend, "검색 흐름"),
    keywords: kwRows ? kwRows.filter((k) => k.volume >= 10).sort((a, b) => b.volume - a.volume).slice(0, 40) : null,
    notes,
  });
}
