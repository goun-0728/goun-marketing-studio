import { notFound } from "next/navigation";
import ReportView from "@/components/ReportView";
import { hasKv, kvGet } from "@/lib/kv";
import { monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

async function load(id) {
  if (!hasKv()) return null;
  try {
    return await kvGet("r", id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) return { title: "마케팅 리포트" };
  const title = `${r.store} ${monthLabel(r.month)} 마케팅 리포트 · ${r.agency || "고운기획"}`;
  return { title, description: r.headline || "", openGraph: { title, description: r.headline || "" }, robots: { index: false } };
}

export default async function Page({ params }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) notFound();
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <ReportView report={r} />
    </div>
  );
}
