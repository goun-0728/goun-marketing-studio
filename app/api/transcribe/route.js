import { checkAuth } from "@/lib/server-auth";
import { rateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

// 브라우저에서 16kHz 모노 WAV로 줄여서 보낸 음성을 OpenAI 음성인식으로 받아쓰기 → 타임코드 자막 반환
export async function POST(req) {
  const denied = checkAuth(req);
  if (denied) return denied;
  const limited = rateLimit(req, "stt", 20);
  if (limited) return limited;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "음성인식 자막은 OPENAI_API_KEY 환경변수가 필요합니다. (AI 자막 모드는 키 없이 사용 가능)" },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file) return Response.json({ error: "오디오 파일이 없습니다." }, { status: 400 });

  const fd = new FormData();
  fd.append("file", file, "audio.wav");
  fd.append("model", process.env.OPENAI_STT_MODEL || "whisper-1");
  fd.append("language", "ko");
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json({ error: data?.error?.message || `음성인식 실패 (${res.status})` }, { status: 502 });
  }

  const segments = (data.segments || [])
    .map((s) => ({ start: s.start, end: s.end, text: String(s.text || "").trim() }))
    .filter((s) => s.text);
  return Response.json({ segments, text: data.text || "" });
}
