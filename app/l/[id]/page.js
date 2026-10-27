import { notFound } from "next/navigation";
import LocalView from "@/components/LocalView";
import { hasKv, kvGet } from "@/lib/kv";

export const dynamic = "force-dynamic";

async function load(id) {
  if (!hasKv()) return null;
  try {
    return await kvGet("l", id);
  } catch {
    return null;
  }
}

// 카톡 등에서 링크 미리보기 제목
export async function generateMetadata({ params }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) return { title: "동네 마케팅 전략" };
  const title = `${r.name || "우리 가게"} 동네 마케팅 전략 · ${r.agency || "고운기획"}`;
  const description = r.ai?.headline || "네이버 동네 데이터로 본 가게 분석";
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function Page({ params }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) notFound();
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LocalView r={r} />
    </div>
  );
}
