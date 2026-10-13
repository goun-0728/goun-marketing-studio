import { checkAuth } from "@/lib/server-auth";

// 접속 비밀번호 확인용 (🔑 저장 시 호출)
export async function GET(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  return Response.json({ ok: true, ai: !!process.env.ANTHROPIC_API_KEY });
}
