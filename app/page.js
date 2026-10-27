"use client";

import { useEffect, useState } from "react";
import StoreProfile, { EMPTY_STORE } from "@/components/StoreProfile";
import CopyTab from "@/components/CopyTab";
import StrategyTab from "@/components/StrategyTab";
import CardNewsTab from "@/components/CardNewsTab";
import ShortsTab from "@/components/ShortsTab";
import ReportTab from "@/components/ReportTab";
import DiagnoseTab from "@/components/DiagnoseTab";
import { KEY_STORAGE, verifyKey } from "@/lib/client";
import { consumeHashImport } from "@/lib/importer";
import { CURRENT, VERSIONS } from "@/lib/version";

const TABS = [
  { id: "diagnose", label: "🔍 페이지 분석" },
  { id: "copy", label: "✍️ 홍보 카피" },
  { id: "strategy", label: "📊 전략 리포트" },
  { id: "cardnews", label: "🖼️ 카드뉴스" },
  { id: "shorts", label: "🎬 숏폼 자동편집" },
  { id: "report", label: "📋 고객 리포트" },
];

export default function Home() {
  const [tab, setTab] = useState("copy");
  const [store, setStore] = useState(EMPTY_STORE);
  const [keyOpen, setKeyOpen] = useState(false);
  const [key, setKey] = useState("");
  const [keyMsg, setKeyMsg] = useState("");
  const [keyOk, setKeyOk] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY_STORAGE) || "";
      setKey(stored);
      verifyKey(stored).then((r) => setKeyOk(r.ok)).catch(() => {});
      const t = localStorage.getItem("gms_tab");
      if (t && TABS.some((x) => x.id === t)) setTab(t);
    } catch {}
    // '고운 진단' 북마크 버튼으로 넘어온 화면 받기
    consumeHashImport().then((d) => {
      if (!d) return;
      setTab("diagnose");
      if (d.error) alert(d.error);
      window.dispatchEvent(new Event("gms-import"));
    });
  }, []);

  const pick = (id) => {
    setTab(id);
    try {
      localStorage.setItem("gms_tab", id);
    } catch {}
  };

  return (
    <>
      <header className="topbar">
        <details className="brand">
          <summary>
            <span className="brand-name">
              고운 <span>마케팅 스튜디오</span>
            </span>
            <span className="brand-ver">
              v{CURRENT.v} · {CURRENT.note}
            </span>
          </summary>
          <div className="ver-list">
            {VERSIONS.map((x) => (
              <div key={x.v}>
                <b>v{x.v}</b> <i>{x.date}</i> {x.note}
              </div>
            ))}
          </div>
        </details>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => pick(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="keybtn" onClick={() => setKeyOpen(true)} title="접속 비밀번호">
          🔑 {keyOk ? "접속됨" : key ? "접속 확인 필요" : "접속키"}
        </button>
      </header>

      <main className="wrap">
        <aside className="sidebar">
          <StoreProfile store={store} setStore={setStore} />
        </aside>
        <section>
          {/* 탭 전환해도 작업 내용이 날아가지 않게 숨김 처리 */}
          <div hidden={tab !== "copy"}><CopyTab store={store} /></div>
          <div hidden={tab !== "strategy"}><StrategyTab store={store} /></div>
          <div hidden={tab !== "cardnews"}><CardNewsTab store={store} /></div>
          <div hidden={tab !== "shorts"}><ShortsTab store={store} /></div>
          <div hidden={tab !== "diagnose"}><DiagnoseTab store={store} /></div>
          <div hidden={tab !== "report"}><ReportTab store={store} active={tab === "report"} /></div>
        </section>
      </main>

      {keyOpen && (
        <div className="modal-bg" onClick={() => setKeyOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>접속 비밀번호</h2>
            <p className="hint">서버에 APP_PASSWORD를 설정했다면 같은 값을 입력하세요. 이 브라우저에만 저장됩니다.</p>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="비밀번호" autoFocus />
            {keyMsg && <p className="hint" style={{ color: keyOk ? "var(--ok)" : "var(--danger)", margin: "8px 0 0" }}>{keyMsg}</p>}
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="btn primary"
                onClick={async () => {
                  const k = key.trim();
                  setKeyMsg("확인 중…");
                  const r = await verifyKey(k).catch(() => ({ ok: false }));
                  if (!r.ok) {
                    setKeyOk(false);
                    setKeyMsg("비밀번호가 맞지 않아요. Vercel의 APP_PASSWORD 값과 똑같은지(띄어쓰기 포함), 저장 후 Redeploy 했는지 확인하세요.");
                    return;
                  }
                  try {
                    localStorage.setItem(KEY_STORAGE, k);
                  } catch {}
                  setKey(k);
                  setKeyOk(true);
                  setKeyMsg(r.ai ? "" : "접속은 됐지만 서버에 ANTHROPIC_API_KEY가 없어요. Vercel에 넣고 Redeploy 하세요.");
                  window.dispatchEvent(new Event("gms-key"));
                  if (r.ai) setKeyOpen(false);
                }}
              >
                확인 · 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
