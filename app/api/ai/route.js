import { buildPrompt } from "@/lib/prompts";
import { checkAuth } from "@/lib/server-auth";
import { rateLimit } from "@/lib/ratelimit";

export const maxDuration = 180;

function extractJSON(text) {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }
  // 답이 길어 중간에 잘린 경우: 마지막으로 완성된 항목까지만 살려서 닫기
  if (start >= 0) {
    let body = cleaned.slice(start);
    for (let i = 0; i < 40; i++) {
      const cut = body.lastIndexOf("},");
      if (cut < 0) break;
      body = body.slice(0, cut + 1);
      const opens = (body.match(/\[/g) || []).length - (body.match(/\]/g) || []).length;
      const braces = (body.match(/\{/g) || []).length - (body.match(/\}/g) || []).length;
      try {
        return JSON.parse(body + "]".repeat(Math.max(0, opens)) + "}".repeat(Math.max(0, braces)));
      } catch {}
    }
  }
  return null;
}

export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  const limited = rateLimit(req, "ai", 40);
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버에 ANTHROPIC_API_KEY 환경변수가 없습니다." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let p;
  try {
    p = buildPrompt(body.task, body.store, body.options);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  // 이미지 첨부: data URL(캡처) → base64 블록, https 주소(상세페이지 이미지) → url 블록
  const dataImgs = (Array.isArray(body.images) ? body.images : [])
    .slice(0, 5)
    .map((d) => String(d).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/))
    .filter(Boolean)
    .map(([, media_type, data]) => ({ type: "image", source: { type: "base64", media_type, data } }));
  const urlImgs = (Array.isArray(body.imageUrls) ? body.imageUrls : [])
    .filter((u) => /^https:\/\//.test(String(u)))
    .slice(0, 8)
    .map((url) => ({ type: "image", source: { type: "url", url } }));

  const call = (imgs) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: p.maxTokens || 4000,
        system: p.system,
        messages: [{ role: "user", content: imgs.length ? [...imgs, { type: "text", text: p.user }] : p.user }],
      }),
    });

  let imageNote = "";
  let res = await call([...dataImgs, ...urlImgs]);
  let data = await res.json().catch(() => ({}));
  // 상세페이지 이미지 주소를 AI가 못 불러오면(차단 등) 이미지 없이 다시 시도
  if (!res.ok && urlImgs.length && res.status === 400) {
    imageNote = "상세페이지 이미지를 불러오지 못해 글자 정보로만 분석했어요.";
    res = await call(dataImgs);
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok) {
    const m = String(data?.error?.message || "");
    const friendly =
      res.status === 401 || /x-api-key/i.test(m)
        ? "Claude API 키가 맞지 않아요. Vercel의 ANTHROPIC_API_KEY 값을 다시 복사해 넣고 Redeploy 하세요."
        : /credit|balance|billing/i.test(m)
          ? "Claude API 크레딧이 부족해요. console.anthropic.com → Billing에서 충전하세요."
          : res.status === 429
            ? "AI 사용량이 몰렸어요. 1분 뒤 다시 시도하세요."
            : m || `AI 호출 실패 (${res.status})`;
    return Response.json({ error: friendly }, { status: 502 });
  }

  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  if (p.json) {
    const parsed = extractJSON(text);
    if (!parsed) return Response.json({ error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.", raw: text }, { status: 502 });
    return Response.json({ data: parsed, imageNote });
  }
  return Response.json({ text });
}
