"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { callAI, copyText, downloadBlob, safeName } from "@/lib/client";
import { renderSlide, THEMES } from "@/lib/cardnews";
import { ensureFonts, loadImage } from "@/lib/draw";
import { logWork } from "@/lib/report";
import { outKey, usePersistentState } from "@/lib/usePersist";
import ExportButtons from "./ExportButtons";
import { docShell, esc } from "@/lib/exporter";
import { Loading } from "./CopyTab";
import { fileName } from "@/lib/naming";
import { delPhoto, getPhoto, putPhoto, shrinkPhoto } from "@/lib/photoStore";

const rid = () => Math.random().toString(36).slice(2, 10);

const ACCENTS = ["#e8572a", "#d93a5b", "#2f6fdf", "#1f8a4c", "#8a5cf6", "#c9a227", "#1b1a17"];

function SlideCanvas({ slide, opts, onCanvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      renderSlide(ref.current, slide, opts);
      onCanvas?.(ref.current);
    }
  });
  return <canvas ref={ref} />;
}

export default function CardNewsTab({ store }) {
  const [topic, setTopic] = usePersistentState(outKey("cardnews_topic", store.name), "");
  const [count, setCount] = useState(6);
  const [theme, setTheme] = useState("clean");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [photos, setPhotos] = useState([]); // HTMLImageElement[]
  const [photoMode, setPhotoMode] = useState("cover"); // none | cover | all
  const [slides, setSlides] = usePersistentState(outKey("cardnews", store.name), []);
  const [caption, setCaption] = usePersistentState(outKey("cardnews_caption", store.name), "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fontReady, setFontReady] = useState(false);
  const canvases = useRef([]);
  const [own, setOwn] = useState({}); // 페이지별 사진 {slideId: HTMLImageElement}
  const [dropAt, setDropAt] = useState(null);
  const pkey = (id) => `${store.name || "_"}|${id}`;

  // 예전에 만든 카드에도 페이지 번호표(id) 붙이기 — 사진을 페이지에 붙여두려면 필요
  useEffect(() => {
    if (slides.some((s) => !s.id)) setSlides(slides.map((s) => (s.id ? s : { ...s, id: rid() })));
  }, [slides, setSlides]);

  // 저장해둔 페이지별 사진 불러오기 (새로고침·업체 전환 후에도 유지)
  useEffect(() => {
    let live = true;
    (async () => {
      const next = {};
      for (const sl of slides) {
        if (!sl.id || !sl.photo) continue;
        if (own[sl.id]) { next[sl.id] = own[sl.id]; continue; }
        const blob = await getPhoto(pkey(sl.id));
        if (blob) next[sl.id] = await loadImage(URL.createObjectURL(blob));
      }
      if (live && (Object.keys(next).length !== Object.keys(own).length || Object.keys(next).some((k) => next[k] !== own[k]))) setOwn(next);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, store.name]);

  const setPagePhoto = async (i, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const sl = slides[i];
    const id = sl.id || rid();
    const blob = await shrinkPhoto(file);
    await putPhoto(pkey(id), blob);
    const img = await loadImage(URL.createObjectURL(blob));
    setOwn((o) => ({ ...o, [id]: img }));
    setSlides((cur) => cur.map((s, j) => (j === i ? { ...s, id, photo: true, noPhoto: false } : s)));
  };

  const removePagePhoto = (i) => {
    const sl = slides[i];
    if (sl.photo) {
      delPhoto(pkey(sl.id));
      setOwn((o) => { const n = { ...o }; delete n[sl.id]; return n; });
    }
    // 공통 사진(표지·전체 배경)이 깔리는 페이지라면 이 장만 빼기
    setSlides((cur) => cur.map((s, j) => (j === i ? { ...s, photo: false, noPhoto: true } : s)));
  };

  const addPage = (at) => {
    const next = [...slides];
    next.splice(at, 0, { id: rid(), type: at === 0 ? "cover" : "content", headline: "새 페이지 제목", sub: "", body: "" });
    setSlides(next);
  };

  const removePage = (i) => {
    const sl = slides[i];
    if ((sl.headline || sl.body || sl.photo) && !confirm(`${i + 1}번째 장을 지울까요?`)) return;
    if (sl.photo) delPhoto(pkey(sl.id));
    setSlides(slides.filter((_, j) => j !== i));
  };

  useEffect(() => {
    ensureFonts().then(() => setFontReady(true));
  }, []);

  const addPhotos = async (files) => {
    const imgs = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map((f) => loadImage(f)));
    setPhotos((p) => [...p, ...imgs].slice(0, 12));
  };

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await callAI("cardnews", store, { topic, slides: count });
      // 다시 만들어도 같은 자리 페이지에 넣은 사진은 그대로 유지
      setSlides((data.slides || []).map((s, i) => (slides[i]?.id ? { ...s, id: slides[i].id, photo: slides[i].photo, noPhoto: slides[i].noPhoto } : { ...s, id: rid() })));
      setCaption([data.caption, (data.hashtags || []).join(" ")].filter(Boolean).join("\n\n"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const imgFor = (i) => {
    const sl = slides[i];
    if (sl?.photo && own[sl.id]) return own[sl.id];
    if (sl?.noPhoto) return null;
    if (!photos.length || photoMode === "none") return null;
    if (photoMode === "cover") return i === 0 ? photos[0] : null;
    return photos[i % photos.length];
  };

  const edit = (i, k, v) => setSlides(slides.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next);
  };

  // 업체_주제_카드뉴스_날짜
  const cardBase = () => fileName({ store: store.name, product: topic, kind: "카드뉴스" });
  const toBlob = (cv) => new Promise((r) => cv.toBlob(r, "image/png"));

  const downloadOne = async (i) => {
    const cv = canvases.current[i];
    if (cv) downloadBlob(await toBlob(cv), `${cardBase()}_${String(i + 1).padStart(2, "0")}.png`);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    for (let i = 0; i < slides.length; i++) {
      const cv = canvases.current[i];
      if (cv) zip.file(`${String(i + 1).padStart(2, "0")}.png`, await toBlob(cv));
    }
    if (caption) zip.file("caption.txt", caption);
    downloadBlob(await zip.generateAsync({ type: "blob" }), `${cardBase()}.zip`);
    logWork(store.name, "카드뉴스", `${slides[0]?.headline || topic || "카드뉴스"} (${slides.length}장)`);
  };

  return (
    <>
      <div className="panel">
        <h2>🖼️ 카드뉴스 / 홍보 이미지</h2>
        <p className="hint">AI가 원고를 쓰고 1080×1350(인스타 4:5) 이미지로 바로 만들어요. 텍스트는 생성 후 직접 고칠 수 있어요.</p>

        <div className="grid2">
          <label className="field">
            <span>주제</span>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 닭발 맛있게 먹는 5가지 방법 / 가을 신메뉴 출시" />
          </label>
          <label className="field">
            <span>장수</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[4, 5, 6, 7, 8, 10].map((n) => (
                <option key={n} value={n}>{n}장</option>
              ))}
            </select>
          </label>
        </div>

        <h3>디자인</h3>
        <div className="row" style={{ gap: 14 }}>
          <div className="chips">
            {Object.entries(THEMES).map(([k, t]) => (
              <span key={k} className={`chip ${theme === k ? "on" : ""}`} onClick={() => setTheme(k)}>
                {t.label}
              </span>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {ACCENTS.map((a) => (
              <button key={a} className={`swatch ${accent === a ? "on" : ""}`} style={{ background: a }} onClick={() => setAccent(a)} aria-label={a} />
            ))}
          </div>
        </div>

        <h3>공통 사진 (선택)</h3>
        <p className="hint" style={{ marginTop: -4 }}>여러 장에 한 번에 깔 사진이에요. 페이지마다 다른 사진은 아래 카드에서 <b>📷 사진</b>을 누르거나 카드 위로 끌어다 놓으세요.</p>
        <div className="row">
          <label className="btn">
            사진 추가
            <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
          </label>
          <span className="hint" style={{ margin: 0 }}>{photos.length}장</span>
          {photos.length > 0 && (
            <>
              <select value={photoMode} onChange={(e) => setPhotoMode(e.target.value)} style={{ width: "auto" }}>
                <option value="cover">표지에만 사진</option>
                <option value="all">모든 장에 사진 배경</option>
                <option value="none">사진 안 씀</option>
              </select>
              <button className="btn small" onClick={() => setPhotos([])}>비우기</button>
            </>
          )}
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={run} disabled={busy}>
            {busy ? "원고 작성 중…" : slides.length ? "원고 다시 만들기" : "카드뉴스 만들기"}
          </button>
          {busy && <Loading text="원고 쓰는 중 (10~20초)" />}
          {slides.length > 0 && !busy && (
            <>
              <button className="btn dark" onClick={downloadAll}>전체 다운로드 (ZIP)</button>
              <ExportButtons
                title={`${store.name || "고객사"} 카드뉴스 시안`}
                fileBase={cardBase}
                getBody={() =>
                  docShell({
                    kind: "카드뉴스 시안",
                    store: store.name,
                    title: `${store.name || "고객사"} 카드뉴스 시안`,
                    sub: `${topic ? `주제: ${topic} · ` : ""}${slides.length}장 · 1080×1350 (인스타 4:5)`,
                    inner:
                      `<div class="slides">${slides.map((_, i) => (canvases.current[i] ? `<img src="${canvases.current[i].toDataURL("image/jpeg", 0.85)}" alt="${i + 1}장">` : "")).join("")}</div>` +
                      (caption ? `<h2>게시물 캡션</h2><div class="card"><div class="body">${esc(caption)}</div></div>` : ""),
                  })
                }
              />
            </>
          )}
        </div>
        {err && <div className="error">{err}</div>}
      </div>

      {caption && (
        <div className="panel">
          <div className="meta row" style={{ justifyContent: "space-between" }}>
            <b>게시물 캡션</b>
            <button className="btn small" onClick={() => copyText(caption)}>복사</button>
          </div>
          <textarea rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} style={{ marginTop: 8 }} />
        </div>
      )}

      {fontReady && slides.length > 0 && (
        <div className="slides">
          {slides.map((s, i) => (
            <div
              className={`slide ${dropAt === i ? "drop" : ""}`}
              key={s.id || i}
              onDragOver={(e) => { e.preventDefault(); setDropAt(i); }}
              onDragLeave={() => setDropAt(null)}
              onDrop={(e) => { e.preventDefault(); setDropAt(null); setPagePhoto(i, e.dataTransfer.files?.[0]); }}
            >
              <SlideCanvas
                slide={s}
                opts={{ theme, accent, brand: store.name, img: imgFor(i), index: i, total: slides.length }}
                onCanvas={(cv) => (canvases.current[i] = cv)}
              />
              <select value={s.type} onChange={(e) => edit(i, "type", e.target.value)}>
                <option value="cover">표지</option>
                <option value="content">본문</option>
                <option value="cta">마무리(CTA)</option>
              </select>
              <input type="text" value={s.headline || ""} onChange={(e) => edit(i, "headline", e.target.value)} placeholder="제목" />
              <input type="text" value={s.sub || ""} onChange={(e) => edit(i, "sub", e.target.value)} placeholder={s.type === "cta" ? "버튼 문구" : "부제"} />
              {s.type !== "cover" && (
                <textarea rows={3} value={s.body || ""} onChange={(e) => edit(i, "body", e.target.value)} placeholder="본문" />
              )}
              <div className="row" style={{ gap: 6 }}>
                <label className="btn small">
                  📷 {s.photo ? "사진 바꾸기" : "사진"}
                  <input type="file" accept="image/*" hidden onChange={(e) => { setPagePhoto(i, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {imgFor(i) ? (
                  <button className="btn small" onClick={() => removePagePhoto(i)}>사진 빼기</button>
                ) : s.noPhoto && photos.length > 0 && photoMode !== "none" ? (
                  <button className="btn small" onClick={() => edit(i, "noPhoto", false)}>공통 사진 쓰기</button>
                ) : null}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} title="앞으로">◀</button>
                <button className="btn small" onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="뒤로">▶</button>
                <button className="btn small" onClick={() => addPage(i + 1)} title="이 장 뒤에 새 페이지">＋ 뒤에 추가</button>
                <button className="btn small" onClick={() => downloadOne(i)}>PNG</button>
                <button className="btn small danger" onClick={() => removePage(i)}>삭제</button>
              </div>
            </div>
          ))}
          <button className="slide-add" onClick={() => addPage(slides.length)}>＋<span>페이지 추가</span></button>
        </div>
      )}
    </>
  );
}
