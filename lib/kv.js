// 서버 전용: 짧은 공유 링크용 저장소 (Vercel → Storage → Upstash for Redis, 무료)
// 연결하면 Vercel이 환경변수를 자동으로 넣어줌 (KV_REST_API_URL/TOKEN 또는 UPSTASH_REDIS_REST_URL/TOKEN)
import crypto from "node:crypto";

function conf() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export const hasKv = () => !!conf();

async function cmd(args) {
  const c = conf();
  const r = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `저장소 오류 (${r.status})`);
  return j.result;
}

const ABC = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; // 헷갈리는 0·O·1·l 제외
export function newId(len = 8) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ABC[b % ABC.length]).join("");
}

const DAYS = 365;
export async function kvPut(kind, data) {
  for (let i = 0; i < 3; i++) {
    const id = newId();
    // NX: 이미 있는 id면 덮어쓰지 않음
    const ok = await cmd(["SET", `share:${kind}:${id}`, JSON.stringify(data), "EX", String(DAYS * 86400), "NX"]);
    if (ok === "OK") return id;
  }
  throw new Error("링크 만들기 실패, 다시 시도해 주세요.");
}

export async function kvGet(kind, id) {
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return null;
  const raw = await cmd(["GET", `share:${kind}:${id}`]);
  return raw ? JSON.parse(raw) : null;
}
