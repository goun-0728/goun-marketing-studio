import { checkAuth } from "@/lib/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { hasTrendApi, naverSearch } from "@/lib/naver";

export const maxDuration = 30;

// 홍보 카피용: 키워드로 지금 네이버 블로그·지식iN·카페에서 위에 보이는 글
export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  const limited = rateLimit(req, "buzz", 40);
  if (limited) return limited;
  const { keyword = "" } = await req.json().catch(() => ({}));
  const q = String(keyword).trim().slice(0, 40);
  if (!q) return Response.json({ error: "키워드를 넣어 주세요." }, { status: 400 });
  if (!hasTrendApi()) return Response.json({ error: "NAVER API HUB 키(NCP_HUB_CLIENT_ID/SECRET)가 버셀에 없어요." }, { status: 400 });

  const [blog, kin, cafe] = await Promise.allSettled([naverSearch("blog", q, 30), naverSearch("kin", q, 20), naverSearch("cafearticle", q, 20)]);
  const pick = (r, name) => (r.status === "fulfilled" ? r.value : { total: 0, items: [], error: `${name}: ${r.reason?.message}` });
  const out = { keyword: q, at: new Date().toISOString(), blog: pick(blog, "블로그"), kin: pick(kin, "지식iN"), cafe: pick(cafe, "카페") };
  return Response.json(out);
}
