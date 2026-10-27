import { checkAuth } from "@/lib/server-auth";
import { hasKv, kvGet, kvPut } from "@/lib/kv";

export const dynamic = "force-dynamic";
const KINDS = ["d", "r", "l"]; // d = 페이지 분석, r = 월간 리포트, l = 오프라인 가게

// 짧은 링크 만들기 (스튜디오에서만 — 접속 비밀번호 필요)
export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  if (!hasKv()) return Response.json({ error: "no-kv" }, { status: 501 });
  const { kind, data } = await req.json().catch(() => ({}));
  if (!KINDS.includes(kind) || !data) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const body = JSON.stringify(data);
  if (body.length > 400_000) return Response.json({ error: "내용이 너무 커요." }, { status: 413 });
  try {
    const id = await kvPut(kind, data);
    return Response.json({ id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}

// 고객이 링크를 열 때 (비밀번호 없이)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("k");
  const id = searchParams.get("id") || "";
  if (!KINDS.includes(kind) || !hasKv()) return Response.json({ error: "not found" }, { status: 404 });
  try {
    const data = await kvGet(kind, id);
    if (!data) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
