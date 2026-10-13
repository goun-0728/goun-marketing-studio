"use client";

import { useState } from "react";
import { CHANNELS } from "@/lib/prompts";
import { callAI, copyText } from "@/lib/client";
import { outKey, usePersistentState } from "@/lib/usePersist";
import ExportButtons from "./ExportButtons";
import { docShell, esc } from "@/lib/exporter";
import { fileName } from "@/lib/naming";

const GOALS = ["신규 고객 유입", "재구매/단골 만들기", "이벤트·할인 알리기", "신메뉴·신상품 출시", "리뷰 늘리기", "시즌/명절 특수"];

export function Loading({ text }) {
  return (
    <span className="loading">
      <span className="spin" /> {text}
    </span>
  );
}

export default function CopyTab({ store }) {
  const [channels, setChannels] = useState(["인스타그램 피드", "네이버 블로그", "네이버 플레이스 소식"]);
  const [goal, setGoal] = usePersistentState(outKey("copy_goal", store.name), GOALS[0]);
  const [extra, setExtra] = usePersistentState(outKey("copy_extra", store.name), "");
  const [variants, setVariants] = useState(1);
  const [items, setItems] = usePersistentState(outKey("copy", store.name), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(-1);

  const toggle = (c) => setChannels(channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c]);

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await callAI("copy", store, { channels, goal, extra, variants });
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const full = (it) => [it.title, it.body, (it.hashtags || []).join(" ")].filter(Boolean).join("\n\n");

  return (
    <>
      <div className="panel">
        <h2>✍️ 채널별 홍보 카피</h2>
        <p className="hint">채널 규칙(글자수, 광고 표기 등)에 맞춰 한 번에 뽑아요.</p>

        <h3>채널</h3>
        <div className="chips">
          {CHANNELS.map((c) => (
            <span key={c} className={`chip ${channels.includes(c) ? "on" : ""}`} onClick={() => toggle(c)}>
              {c}
            </span>
          ))}
        </div>

        <h3>목적</h3>
        <div className="chips">
          {GOALS.map((g) => (
            <span key={g} className={`chip ${goal === g ? "on" : ""}`} onClick={() => setGoal(g)}>
              {g}
            </span>
          ))}
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>추가 요청 (선택)</span>
            <input type="text" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="예: 비 오는 날 배달 할인 강조" />
          </label>
          <label className="field">
            <span>채널당 안 개수</span>
            <select value={variants} onChange={(e) => setVariants(Number(e.target.value))}>
              <option value={1}>1안</option>
              <option value={2}>2안</option>
              <option value={3}>3안</option>
            </select>
          </label>
        </div>

        <div className="row">
          <button className="btn primary" onClick={run} disabled={busy || !channels.length}>
            {busy ? "작성 중…" : "카피 생성"}
          </button>
          {busy && <Loading text="채널별로 쓰는 중이에요 (20~40초)" />}
          {items.length > 0 && !busy && (
            <ExportButtons
              title={`${store.name || "고객사"} 채널별 홍보 문구`}
              fileBase={() => fileName({ store: store.name, kind: "홍보문구" })}
              getBody={() =>
                docShell({
                  kind: "채널별 홍보 문구",
                  store: store.name,
                  title: `${store.name || "고객사"} 채널별 홍보 문구`,
                  sub: `목적: ${goal}${extra ? ` · ${extra}` : ""} · 총 ${items.length}개`,
                  inner: items
                    .map(
                      (it) => `<div class="card"><span class="badge">${esc(it.channel)}${variants > 1 ? ` · ${it.variant}안` : ""}</span>${it.title ? `<div class="ttl">${esc(it.title)}</div>` : ""}<div class="body">${esc(it.body)}</div>${it.hashtags?.length ? `<div class="tags">${esc(it.hashtags.join(" "))}</div>` : ""}</div>`
                    )
                    .join(""),
                })
              }
            />
          )}
        </div>
        {err && <div className="error">{err}</div>}
      </div>

      {items.length > 0 && (
        <div className="results">
          {items.map((it, i) => (
            <div className="card" key={i}>
              <div className="meta">
                <span className="badge">
                  {it.channel}
                  {variants > 1 ? ` · ${it.variant}안` : ""}
                </span>
                <button
                  className="btn small"
                  onClick={() => {
                    copyText(full(it));
                    setCopied(i);
                    setTimeout(() => setCopied(-1), 1200);
                  }}
                >
                  {copied === i ? "복사됨 ✓" : "복사"}
                </button>
              </div>
              {it.title && <div className="title">{it.title}</div>}
              <div className="body">{it.body}</div>
              {it.hashtags?.length > 0 && <div className="tags">{it.hashtags.join(" ")}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
