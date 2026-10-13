import { notFound } from "next/navigation";
import DiagnoseView from "@/components/DiagnoseView";
import { hasKv, kvGet } from "@/lib/kv";

export const dynamic = "force-dynamic";

async function load(id) {
  if (!hasKv()) return null;
  try {
    return await kvGet("d", id);
  } catch {
    return null;
  }
}

// 카톡 등에서 링크 미리보기 제목
export async function generateMetadata({ params }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: "페이지 분석" };
  const title = `${d.store} 페이지 분석 · ${d.agency || "고운기획"}`;
  const description = d.headline || `${d.product || ""} 페이지 분석 결과`;
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function Page({ params }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) notFound();
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <DiagnoseView diag={d} />
    </div>
  );
}
