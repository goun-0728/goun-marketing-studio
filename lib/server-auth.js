// APP_PASSWORD 가 설정돼 있으면, 브라우저에서 보낸 x-app-key 헤더와 비교해 API 사용을 막는다.
// (Vercel에 올렸을 때 남이 API 키 크레딧을 쓰지 못하게 하는 최소 장치)
export function checkAuth(req) {
  const pw = (process.env.APP_PASSWORD || "").trim();
  if (!pw) return null;
  const got = (req.headers.get("x-app-key") || "").trim();
  let decoded = got;
  try {
    decoded = decodeURIComponent(got);
  } catch {}
  if (got === pw || decoded === pw) return null;
  return Response.json({ error: "접속 비밀번호가 틀렸거나 입력되지 않았습니다. 오른쪽 위 🔑에서 입력하세요." }, { status: 401 });
}
