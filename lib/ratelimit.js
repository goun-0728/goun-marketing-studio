// 사용자(IP)별 시간당 호출 제한 — 여러 명이 같이 써도 API 비용이 폭주하지 않게 하는 안전장치.
// 서버리스 인스턴스마다 따로 세기 때문에 정확한 제한은 아니고 '과사용 방지' 수준.
const buckets = new Map();

export function rateLimit(req, scope, perHour) {
  const limit = Number(process.env[`LIMIT_${scope.toUpperCase()}_PER_HOUR`]) || perHour;
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < 3_600_000);
  if (hits.length >= limit) {
    const waitMin = Math.ceil((3_600_000 - (now - hits[0])) / 60000);
    return Response.json({ error: `사용량이 많아 잠시 쉬어갈게요. 약 ${waitMin}분 뒤 다시 시도해 주세요.` }, { status: 429 });
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return null;
}
