"use client";

import { useState } from "react";
import { CHANNELS } from "@/lib/prompts";
import { callAI, copyText, fetchBuzz } from "@/lib/client";
import { analyzeBuzz, buzzForAI } from "@/lib/buzz";
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

  // 🔎 네이버에서 지금 잘 보이는 글 (블로그·지식iN·카페)
  const [buzz, setBuzz] = usePersistentState(outKey("copy_buzz", store.name), null);
  const [useBuzz, setUseBuzz] = usePersistentState(outKey("copy_buzz_on", store.name), true);
  const [bkw, setBkw] = useState("");
  const [bBusy, setBBusy] = useState(false);
  const [bErr, setBErr] = useState("");
  const kwGuess = String(store.products || store.category || store.name || "").split(/[,\n]/)[0].replace(/\d+\s*(g|kg|ml|개|팩)/gi, "").trim().slice(0, 20);
  const loadBuzz = async () => {
    const q = (bkw || kwGuess).trim();
    if (!q) return setBErr("검색할 키워드를 넣어 주세요.");
    setBBusy(true);
    setBErr("");
    try {
      setBuzz(analyzeBuzz(await fetchBuzz(q)));
      setUseBuzz(true);
    } catch (e) {
      setBErr(e.message);
    } finally {
      setBBusy(false);
    }
  };

  const toggle = (c) => setChannels(channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c]);

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await callAI("copy", store, { channels, goal, extra, variants, buzz: useBuzz && buzz ? buzzForAI(buzz) : null });
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

        <div className="buzz">
          <h3 style={{ marginTop: 0 }}>🔎 네이버에서 지금 잘 보이는 글 <span className="hint" style={{ fontWeight: 400 }}>(선택 · 블로그·지식iN·카페)</span></h3>
          <div className="row" style={{ gap: 6 }}>
            <input type="text" value={bkw} onChange={(e) => setBkw(e.target.value)} placeholder={kwGuess ? `키워드 (비우면 '${kwGuess}')` : "키워드 예: 무뼈닭발"} style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => e.key === "Enter" && loadBuzz()} />
            <button className="btn" onClick={loadBuzz} disabled={bBusy}>{bBusy ? "불러오는 중…" : buzz ? "다시 불러오기" : "불러오기"}</button>
          </div>
          {bErr && <div className="error">{bErr}</div>}
          {buzz && (
            <div className="buzz-body">
              <label className="buzz-use">
                <input type="checkbox" checked={!!useBuzz} onChange={(e) => setUseBuzz(e.target.checked)} /> 이 분석을 카피에 반영 (‘{buzz.keyword}’ · 블로그 글 {buzz.blogTotal.toLocaleString()}개 중 상위 30개)
              </label>
              <div className="buzz-grid">
                <div>
                  <b>상위 글 제목에 자주 나오는 단어</b>
                  <div className="buzz-words">{buzz.words.length ? buzz.words.map((x) => <span key={x.w}>{x.w} <i>{x.n}</i></span>) : <small>겹치는 단어가 적어요</small>}</div>
                  <small>제목 평균 {buzz.avgLen}자{buzz.recentShare != null ? ` · 최근 3개월 글 ${buzz.recentShare}%${buzz.recentShare >= 50 ? " (새 글도 잘 올라가요)" : " (오래된 글이 자리 잡고 있어요)"}` : ""}</small>
                </div>
                <div>
                  <b>상위 글 유형</b>
                  {buzz.types.filter((t) => t.n).map((t) => (
                    <div key={t.name} className="buzz-type"><span>{t.name}</span><i style={{ width: `${t.share}%` }} /><em>{t.share}%</em></div>
                  ))}
                  {buzz.empty.length > 0 && <small className="buzz-gap">빈자리: {buzz.empty.join(", ")} 글은 상위에 없어요 → 이 각도로 쓰면 눈에 띄어요</small>}
                </div>
                {buzz.questions.length > 0 && (
                  <div>
                    <b>지식iN에서 손님이 묻는 것</b>
                    <ul>{buzz.questions.slice(0, 6).map((q, i) => <li key={i}>{q}</li>)}</ul>
                  </div>
                )}
              </div>
              <details>
                <summary>상위 블로그 제목 보기</summary>
                <ol>{buzz.topTitles.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </details>
              {buzz.errors?.length > 0 && <small>일부 못 불러옴: {buzz.errors.join(" / ")}</small>}
            </div>
          )}
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
