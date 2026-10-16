// 고객용 '스토어 정밀 진단서' 화면 — 앱 미리보기 / 공유 링크(/d) / HTML 파일 공용
import { REPORT_CSS } from "./ReportView";

const DIAG_CSS = `
.rp{white-space:pre-line;line-height:1.7;word-break:keep-all;overflow-wrap:anywhere}
.rp table{white-space:normal}
.dg-hero{display:flex;gap:18px;align-items:center;background:var(--soft);border-radius:16px;padding:20px}
.dg-score{width:118px;height:118px;flex:none;position:relative}
.dg-score svg{width:100%;height:100%;transform:rotate(-90deg)}
.dg-score .n{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.dg-score .n b{font-size:36px;font-weight:900;letter-spacing:-.03em;line-height:1}
.dg-score .n span{font-size:12px;color:var(--muted)}
.dg-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:800;border-radius:6px;padding:2px 8px}
.dg-good{background:#e7f4ec;color:#1f7a45}.dg-warn{background:#fdf3dc;color:#8a5a00}.dg-bad{background:#fdeaea;color:#b4232f}
.dg-hero h3{margin:6px 0 4px;font-size:19px;line-height:1.4}
.dg-hero p{margin:0;color:#45423c;font-size:14px}
.dg-areas{display:flex;flex-direction:column;gap:10px}
.dg-area{display:grid;grid-template-columns:120px 1fr 64px;gap:10px;align-items:center;font-size:14px}
.dg-bar{height:10px;background:#eeeae3;border-radius:99px;overflow:hidden}
.dg-bar i{display:block;height:100%;border-radius:99px;background:var(--ink)}
.dg-area .s{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.dg-top{display:flex;flex-direction:column;gap:10px}
.dg-act{border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;grid-template-columns:30px 1fr;gap:4px 10px}
.dg-act .no{grid-row:span 4;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center}
.dg-act .t{font-weight:800;font-size:16px}
.dg-act .why{font-size:13px;color:var(--muted)}
.dg-act .how{font-size:14px;white-space:pre-wrap}
.dg-act .imp{font-size:13px;color:var(--up);font-weight:700}
.dg-hidden{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.dg-hidden div{background:#fff8ec;border:1px solid #f3e2bf;border-radius:12px;padding:12px 14px;font-size:14px}
.dg-hidden b{display:block;margin-bottom:4px}
.dg-strip{position:relative;height:96px;margin:6px 4px 4px}
.dg-strip .axis{position:absolute;left:0;right:0;top:34px;height:2px;background:var(--line)}
.dg-strip .dot{position:absolute;top:28px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#b9b3a8;border:2px solid #fff}
.dg-strip .me{position:absolute;top:8px;margin-left:-1px;width:2px;height:46px;background:var(--accent)}
.dg-strip .me.low{background:#1f8a4c;top:30px;height:24px}
.dg-strip .me.low span{top:46px;color:#1f8a4c}
.dg-strip .me span{position:absolute;top:-6px;left:6px;white-space:nowrap;font-size:12px;font-weight:800;color:var(--accent)}
.dg-strip .med{position:absolute;top:22px;margin-left:-1px;width:2px;height:26px;background:var(--ink)}
.dg-strip .lbl{position:absolute;top:56px;font-size:11px;color:var(--muted);white-space:nowrap;transform:translateX(-50%)}
.dg-table{width:100%;border-collapse:collapse;font-size:14px}
.dg-table th{text-align:left;font-size:12px;color:var(--muted);padding:6px 4px;border-bottom:2px solid var(--line)}
.dg-table td{padding:8px 4px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.dg-table td.r,.dg-table th.r{text-align:right;white-space:nowrap}
.dg-table th{white-space:nowrap}
.dg-season{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end;height:110px;margin-top:6px}
.dg-season div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:11px;color:var(--muted);gap:4px}
.dg-season i{display:block;width:100%;max-width:26px;border-radius:4px 4px 0 0;background:#d6d0c6}
.dg-season .pk i{background:var(--accent)}
.dg-season .cur span{color:var(--ink);font-weight:800}
.dg-find{display:flex;flex-direction:column;gap:8px}
.dg-f{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:10px 0;border-bottom:1px solid var(--line)}
.dg-f .b{grid-row:span 3;align-self:start;margin-top:2px}
.dg-f .t{font-weight:700}
.dg-f .d{font-size:13px;color:var(--muted)}
.dg-f .x{font-size:14px}
.dg-f .x:before{content:"→ ";color:var(--accent);font-weight:800}
.dg-area-h{display:flex;justify-content:space-between;align-items:baseline;margin:18px 0 2px}
.dg-area-h b{font-size:15px}
.dg-cta{margin-top:36px;background:var(--ink);color:#fff;border-radius:16px;padding:22px;text-align:center}
.dg-cta b{display:block;font-size:18px;margin-bottom:6px}
.dg-cta span{font-size:14px;color:#d8d3ca}
.dg-letter{margin:18px 0 0;background:#fffaf2;border:1px solid #f0e2c8;border-radius:14px;padding:18px 20px;font-size:15px;line-height:1.75}
.dg-letter p{margin:0;white-space:pre-wrap}
.dg-letter span{display:block;text-align:right;margin-top:8px;font-weight:700;color:#7a5a2a}
.dg-scope{margin-top:14px;font-size:13px}
.dg-scope b{display:block;margin-bottom:6px;color:var(--muted);font-size:12px}
.dg-scope div{display:flex;flex-wrap:wrap;gap:6px}
.dg-scope span{background:var(--soft);border-radius:99px;padding:4px 10px}
.dg-count{font-size:13px;color:var(--muted);margin:10px 0 0}
.dg-count i{font-style:normal;font-weight:700}
.dg-count .g{color:#1f7a45}.dg-count .w{color:#8a5a00}.dg-count .b{color:#b4232f}
.dg-strengths{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.dg-strengths div{background:#f3faf5;border:1px solid #cfe8d8;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:14px}
.dg-strengths span{color:#45423c;font-size:13px}
.dg-ideas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.dg-ideas div{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:14px}
.dg-ideas span{color:#45423c;font-size:13px}
.dg-ideas em{font-style:normal;font-size:13px;color:var(--accent)}
.dg-ad-sum{margin:0 0 10px;font-size:15px}
.dg-ad-start{background:var(--soft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;font-size:14px;margin:10px 0}
.dg-ad-group{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0}
.dg-ad-group .h{display:flex;align-items:center;gap:8px}
.dg-ad-group .h i{font-style:normal;font-size:11px;font-weight:800;background:#e8f0fd;color:#2a5bd7;border-radius:5px;padding:1px 7px}
.dg-ad-group p{margin:4px 0 6px;font-size:13px;color:var(--muted)}
.dg-ad-group .dg-table{margin:0}
.dg-ad-neg{margin:10px 0;font-size:14px}
.dg-ad-neg div{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.dg-ad-neg span{background:#fdf2f2;color:#b4232f;border-radius:99px;padding:3px 10px;font-size:13px;text-decoration:line-through;text-decoration-color:#b4232f66}
.dg-ad-neg small{color:var(--muted);font-size:12px}
.dg-h3{font-size:15px;margin:16px 0 6px}
.dg-check{margin:0;padding-left:20px;font-size:14px}
.dg-check li{margin-bottom:4px}
.dg-divider{margin:44px 0 6px;padding:16px 0;border-top:3px solid var(--ink);display:flex;flex-direction:column;gap:2px}
.dg-divider span{font-size:20px;font-weight:900}
.dg-divider small{color:var(--muted);font-size:13px}
.dg-journey{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.dg-step{border-radius:12px;padding:12px 14px;border:1px solid var(--line);border-top-width:4px}
.dg-step-good{border-top-color:#1f8a4c}.dg-step-warn{border-top-color:#c98a00}.dg-step-bad{border-top-color:#c0392b}
.dg-step .h{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dg-step .n{width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.dg-step b{font-size:14px}
.dg-step p{margin:6px 0 0;font-size:13px;color:#45423c}
.dg-comp .ct{font-size:13px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dg-comp .cm{font-size:12px;color:var(--muted)}
.dg-comp tr.me td{background:#fdeee8}
.dg-comp td:first-child{white-space:nowrap}
.dg-comp tr.me .cm{color:var(--accent);font-weight:800}
.dg-ba{display:flex;flex-direction:column;gap:8px}
.dg-ba div{border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;font-size:14px}
.dg-ba small{font-size:11px;font-weight:800;letter-spacing:.02em}
.dg-ba .before{background:#f3f1ec;color:#6f6b63;text-decoration:line-through;text-decoration-color:#c0392b80}
.dg-ba .before small{text-decoration:none;display:inline-block}
.dg-ba .after{border:1px solid #cfe8d8;background:#f3faf5}
.dg-ba .after small{color:#1f7a45}
.dg-ba .after span{font-size:13px;color:var(--muted)}
.dg-ref{display:inline-block;vertical-align:middle;font-size:11px;font-weight:800;color:#8a5a00;background:#fdf3dc;border-radius:5px;padding:2px 7px;margin-left:6px}
.dg-refnote{font-size:12px;color:var(--muted);margin:8px 0 0}
.dg-plan{list-style:none;counter-reset:s;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.dg-plan li{counter-increment:s;border-left:3px solid var(--accent);padding:6px 0 6px 14px;display:flex;flex-direction:column;gap:3px;font-size:14px}
.dg-plan li b:before{content:counter(s) ". ";color:var(--accent)}
.dg-plan .now{font-size:12px;color:var(--muted)}
.dg-plan q,.dg-replies q{display:block;background:var(--soft);border-radius:8px;padding:8px 12px;font-size:13px;quotes:none;margin-top:2px}
.dg-rv{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.dg-rv>div{border-radius:12px;padding:12px 14px;font-size:14px}
.dg-rv ul{margin:6px 0;padding-left:18px}
.dg-rv small{font-size:12px;color:var(--muted)}
.dg-rv .pos{background:#f3faf5;border:1px solid #cfe8d8}
.dg-negq{display:flex;flex-direction:column;gap:6px;margin:6px 0}
.dg-negq q{display:block;background:#fff;border-radius:8px;padding:6px 10px;font-size:13px;quotes:none}
.dg-negq q i{font-style:normal;font-weight:800;color:#b4232f;margin-right:6px}
.dg-cat{display:flex;flex-direction:column;gap:6px}
.dg-cat .row{display:grid;grid-template-columns:1fr 140px 44px;gap:8px;align-items:center;font-size:13px}
.dg-cat .row.me b{color:var(--accent)}
.dg-cat .r{text-align:right}
.dg-cat .bar{height:8px;background:#eeeae3;border-radius:99px;overflow:hidden}
.dg-cat .bar i{display:block;height:100%;background:var(--ink);border-radius:99px}
.dg-cat .row.me .bar i{background:var(--accent)}
.dg-cat .my{background:var(--soft);border-radius:10px;padding:10px 12px;font-size:14px}
.dg-rv .neg{background:#fdf2f2;border:1px solid #f1d0d0}
.dg-replies{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.dg-replies>div{display:flex;flex-direction:column;gap:4px;font-size:14px}
.dg-replies .x{font-size:13px}
.dg-replies .x:before{content:"→ ";color:var(--accent);font-weight:800}
.dg-note{margin:2px 0 6px;font-size:14px;color:#45423c;background:var(--soft);border-radius:8px;padding:8px 12px}
.dg-road{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.dg-road h4{margin:0 0 6px;font-size:14px;padding-bottom:4px;border-bottom:2px solid var(--ink)}
.dg-road .task{display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.dg-road .tags{display:flex;gap:4px}
.dg-road .tags i{font-style:normal;font-size:11px;font-weight:700;border-radius:5px;padding:1px 6px;background:#eeeae3;color:#5c584f}
.dg-road .tags i.who-a{background:#fdeee8;color:var(--accent)}
.dg-offer{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.dg-offer div{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:14px}
.dg-offer span{color:var(--muted);font-size:13px}
.dg-glance{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:4px}
.dg-glance>div{background:var(--soft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.dg-glance small{font-size:12px;color:var(--muted)}
.dg-glance b{font-size:22px;font-weight:900;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.25}
.dg-glance span{font-size:12px;color:#45423c}
.dg-glance .hot b{color:var(--accent)}
.dg-kw td.k{max-width:200px}
.dg-kw tr.main td{background:#fdeee8;font-weight:700}
.dg-kw .vb{display:inline-block;height:6px;border-radius:3px;background:#d6d0c6;vertical-align:middle;margin-left:6px}
.dg-kw .in-full{color:#1f7a45;font-weight:800}.dg-kw .in-split{color:#8a5a00;font-weight:700}.dg-kw .in-none{color:#b4232f;font-weight:700}
.dg-sci{display:flex;flex-direction:column;gap:12px}
.dg-sci>div{border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;font-size:14px}
.dg-sci .hd{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.dg-sci .fld{font-size:11px;font-weight:800;border-radius:5px;padding:2px 7px;background:#eef2fb;color:#2f57b7}
.dg-sci .fld.bio{background:#e9f5ee;color:#1f7a45}.dg-sci .fld.phy{background:#f3ecfb;color:#6b3fb5}.dg-sci .fld.eco{background:#fdf3dc;color:#8a5a00}
.dg-sci .ttl{font-weight:800;font-size:15px}
.dg-sci .res{font-size:15px;font-weight:600;line-height:1.6}
.dg-sci .res em{font-weight:800}
.dg-sci .res em{font-style:normal;color:var(--accent)}
.dg-sci .how{font-size:11.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:6px}
.dg-sci .so{background:var(--soft);border-radius:8px;padding:8px 12px}
.dg-sci .so:before{content:"그래서 → ";font-weight:800;color:var(--accent)}
.dg-tail{display:flex;align-items:flex-end;gap:2px;height:60px}
.dg-tail i{flex:1;background:#d6d0c6;border-radius:2px 2px 0 0;min-height:2px}
.dg-tail i.h{background:var(--ink)}
.dg-ladder{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dg-ladder div{border:1px solid var(--line);border-radius:10px;padding:10px;text-align:center;display:flex;flex-direction:column;gap:2px}
.dg-ladder .t{border:2px solid var(--accent);background:#fdeee8}
.dg-ladder b{font-size:16px}.dg-ladder small{font-size:12px;color:var(--muted)}
.dg-locked{font-size:13px;color:var(--muted);border:1px dashed var(--line);border-radius:12px;padding:10px 14px}
@media (max-width:520px){.dg-ladder{grid-template-columns:1fr}.dg-hero{flex-direction:column;text-align:center}.dg-area{grid-template-columns:96px 1fr 52px;font-size:13px}}
`;

// 긴 글은 문장마다 줄을 바꿔 읽기 쉽게 (짧은 글은 그대로)
const L = (t) => {
  const x = String(t ?? "");
  if (x.length <= 50) return x;
  return x
    .replace(/([.!?])\s+(?=[^\s\d)])/g, "$1\n")
    // '1) … 2) …', '① … ②' 처럼 이어진 단계는 줄을 나눔
    .replace(/\s+(?=(?:[2-9]|1[0-9])\)\s)/g, "\n")
    .replace(/\s+(?=[②-⑩])/g, "\n")
    .replace(/\n{2,}/g, "\n");
};
const won = (n) => `${Math.round(n).toLocaleString()}원`;
const LEVEL = { good: ["dg-good", "✓ 잘하고 있어요"], warn: ["dg-warn", "보완 추천"], bad: ["dg-bad", "우선 개선"] };

function Badge({ level }) {
  const [cls, label] = LEVEL[level] || LEVEL.warn;
  return <span className={`dg-badge ${cls}`}>{label}</span>;
}

function ScoreRing({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#1f8a4c" : score >= 50 ? "#c98a00" : "#c0392b";
  return (
    <div className="dg-score" role="img" aria-label={`진단 점수 ${score}점`}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e8e4dc" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
      </svg>
      <div className="n">
        <b>{score}</b>
        <span>/ 100점</span>
      </div>
    </div>
  );
}

function PriceStrip({ price }) {
  const all = [...price.prices, price.my, ...(price.minEff ? [price.minEff] : [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const x = (v) => (hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100);
  return (
    <>
      <div className="dg-strip" aria-label="상위 상품 가격 분포">
        <div className="axis" />
        {price.prices.map((p, i) => (
          <div key={i} className="dot" style={{ left: `${x(p)}%` }} title={won(p)} />
        ))}
        <div className="med" style={{ left: `${x(price.med)}%` }} title={`중앙값 ${won(price.med)}`} />
        {price.minEff ? (
          <div className="me low" style={{ left: `${x(price.minEff)}%` }}>
            <span style={x(price.minEff) > 70 ? { left: "auto", right: 6 } : undefined}>가장 싼 구성 {won(price.minEff)}</span>
          </div>
        ) : null}
        <div className="me" style={{ left: `${x(price.my)}%` }}>
          <span style={x(price.my) > 70 ? { left: "auto", right: 6 } : undefined}>내 상품 {won(price.my)}</span>
        </div>
        <div className="lbl" style={{ left: "0%", transform: "none" }}>{won(lo)}</div>
        <div className="lbl" style={{ left: `${x(price.med)}%` }}>중앙값 {won(price.med)}</div>
        <div className="lbl" style={{ left: "auto", right: 0, transform: "none" }}>{won(hi)}</div>
      </div>
      <p className="rp-note">회색 점 = 검색 결과 상위 {price.prices.length}개 상품 가격 (광고 제외) · 검은 선 = 중앙값{price.minEff ? " · 초록 선 = 옵션 중 가장 싼 구성" : ""}</p>
    </>
  );
}


const n0 = (v) => (v == null ? "-" : Number(v).toLocaleString());
const IN = { full: ["in-full", "✓ 있음"], split: ["in-split", "나눠서 있음"], none: ["in-none", "없음"] };

// 📊 한눈에 보기
function Glance({ d }) {
  const s = d.sci || {};
  const cells = [];
  if (s.mainRow) cells.push({ k: "대표 키워드 월 검색량", v: `${n0(s.mainRow.volume)}회`, s: `‘${s.mainRow.keyword}’ · 경쟁 ${s.mainRow.comp || "-"}`, hot: true });
  if (s.coverage) cells.push({ k: "관련 키워드 검색 합계", v: `${n0(s.coverage.total)}회`, s: `관련 키워드 ${s.tableTotal}개 · 한 달 기준` });
  if (s.coverage) cells.push({ k: "상품명 검색 커버율", v: `${s.coverage.pct}%`, s: "관련 검색량 중 상품명이 잡는 비율", hot: s.coverage.pct < 60 });
  if (s.mobile != null) cells.push({ k: "모바일 검색 비중", v: `${s.mobile}%`, s: "상세페이지는 휴대폰 화면 기준으로" });
  if (d.myRank) cells.push({ k: "검색 순위", v: `${d.myRank}위`, s: `‘${d.keyword}’ 광고 제외 자연 순위` });
  if (s.price) cells.push({ k: "가격 위치", v: s.price.zone, s: s.priceMin ? `대표가 기준 · 가장 싼 구성은 ${s.priceMin.zone}` : `경쟁 ${s.price.n}개 중 ${s.price.pct}%보다 비쌈` });
  if (s.wave) cells.push({ k: "다음 성수기", v: s.wave.monthsToPeak === 0 ? "지금" : `${s.wave.peak}월`, s: s.wave.monthsToPeak === 0 ? "지금이 검색 정점이에요" : `${s.wave.prepare}월부터 준비 · ${s.wave.monthsToPeak}개월 남음`, hot: s.wave.monthsToPeak > 0 && s.wave.monthsToPeak <= 2 });
  if (!cells.length) return null;
  return (
    <>
      <h2>📊 한눈에 보기</h2>
      <div className="dg-glance">
        {cells.map((c) => (
          <div key={c.k} className={c.hot ? "hot" : ""}>
            <small>{c.k}</small>
            <b>{c.v}</b>
            <span>{c.s}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// 🔎 관련 키워드 월 검색량
function KeywordVolume({ d }) {
  const s = d.sci || {};
  if (!s.table?.length) return null;
  const max = Math.max(...s.table.map((r) => r.volume), 1);
  return (
    <>
      <h2>🔎 관련 키워드 월 검색량</h2>
      <p className="rp-note" style={{ marginTop: 0 }}>
        네이버 검색광고 키워드 도구 기준 최근 한 달 검색 횟수예요. ‘상품명’ 칸은 그 검색어가 지금 상품명에 들어 있는지 보여줘요.
        {s.coverage?.missing?.length ? ` 상품명에 없는 것 중 검색이 많은 건 ${s.coverage.missing.map((m) => `‘${m.keyword}’`).join(", ")}이에요.` : ""}
      </p>
      <table className="dg-table dg-kw">
        <thead>
          <tr>
            <th>키워드</th>
            <th className="r">월 검색량</th>
            <th className="r">PC</th>
            <th className="r">모바일</th>
            <th className="r">경쟁</th>
            <th className="r">상품명</th>
          </tr>
        </thead>
        <tbody>
          {s.table.map((r) => (
            <tr key={r.keyword} className={r.main ? "main" : ""}>
              <td className="k">{r.keyword}{r.main ? " (대표)" : ""}</td>
              <td className="r">
                {r.low ? "10 미만" : n0(r.volume)}
                <i className="vb" style={{ width: `${Math.max(2, (r.volume / max) * 48)}px` }} />
              </td>
              <td className="r">{n0(r.pc)}</td>
              <td className="r">{n0(r.mobile)}</td>
              <td className="r">{r.comp || "-"}</td>
              <td className={`r ${IN[r.inTitle][0]}`}>{IN[r.inTitle][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.tableTotal > s.table.length && <p className="rp-note">검색량 많은 순 {s.table.length}개만 표시 (관련 키워드 총 {s.tableTotal}개)</p>}
    </>
  );
}

// 🔬 데이터 과학 분석 — 결론은 쉬운 말로, 학문 용어·계산식은 작은 '계산 근거'로만
const PHASE = {
  "정점 부근": "지금이 1년 중 가장 많이 찾는 때예요",
  상승기: "지금부터 찾는 사람이 늘어나는 시기예요",
  하강기: "성수기가 지나 찾는 사람이 줄어드는 시기예요",
  비수기: "지금은 찾는 사람이 적은 시기예요",
  평탄기: "지금은 평소 수준으로 찾는 시기예요",
};

function SciCard({ field, cls = "", title, res, children, basis, so }) {
  return (
    <div>
      <div className="hd">
        <span className="ttl">{title}</span>
        <span className={`fld ${cls}`}>{field}</span>
      </div>
      <div className="res">{res}</div>
      {children}
      {so && <div className="so">{L(so)}</div>}
      {basis && <div className="how">계산 근거 · {basis}</div>}
    </div>
  );
}

function Science({ d }) {
  const s = d.sci || {};
  const items = [];

  if (s.restructure) {
    const r = s.restructure;
    items.push(
      <SciCard
        key="rs"
        field="행동경제학 · 앵커링"
        cls="eco"
        title="같은 상품, 더 싸 보이게 하는 가격 구조"
        res={
          <>
            손님은 <em>처음 본 가격</em>으로 비싼지 싼지를 판단해요.{"\n"}지금은 검색 목록에 {won(r.price)}으로 보이지만, 실제로는 <em>{won(r.base)}</em>부터 살 수 있어요.
          </>
        }
        so={`대표 가격을 ${won(r.base)}으로 내리고, 나머지는 '+ 추가금' 옵션으로 바꿔 보세요. 손님 눈에는 '${won(r.base)}짜리 상품에 좋은 구성을 더하는 것'으로 보여요.${r.maxUp > 50 ? ` 단, 추가금이 대표 가격의 ${r.maxUp}%까지 커져 스마트스토어 옵션 가격 규정에 걸릴 수 있어요. 비싼 구성은 별도 상품으로 나누는 것도 방법이에요.` : ""}`}
        basis="앵커링 효과 — 처음 제시된 숫자가 이후 판단의 기준점이 되는 현상 (Tversky & Kahneman, 1974)"
      >
        <table className="dg-table">
          <thead>
            <tr>
              <th>구성</th>
              <th className="r">지금 표시</th>
              <th className="r">바꾸면</th>
              <th className="r">손님 결제액</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.now}>
                <td>{x.names}</td>
                <td className="r">{x.now === 0 ? "기본" : `${x.now > 0 ? "+" : "−"}${won(Math.abs(x.now))}`}</td>
                <td className="r"><b>{x.after === 0 ? "기본 (대표 가격)" : `+${won(x.after)}`}</b></td>
                <td className="r">{won(x.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SciCard>
    );
  }

  if (s.power) {
    const p = s.power;
    const head = p.top20Share >= 70 || p.alpha >= 1.5;
    const topN = Math.ceil(p.n * 0.2);
    items.push(
      <SciCard
        key="pw"
        field="수학 · 멱법칙"
        title="검색이 어디에 몰려 있나"
        res={
          head ? (
            <>검색이 <em>대표 키워드 몇 개에 몰려</em> 있어요.{"\n"}관련 키워드 {p.n}개 중 상위 {topN}개가 전체 검색의 {p.top20Share}%예요.</>
          ) : (
            <>검색이 <em>여러 작은 키워드에 골고루</em> 퍼져 있어요.{"\n"}상위 {topN}개 키워드는 전체 검색의 {p.top20Share}%뿐이에요.</>
          )
        }
        so={
          p.tailCount > 0
            ? `경쟁이 덜한 작은 키워드 ${p.tailCount}개만 모아도 한 달 ${n0(p.tailVolume)}번 검색돼요 (대표 키워드의 ${p.tailVsMain}%). ${head ? "대표 키워드 순위를 먼저 챙기고, 작은 키워드는 상품명 뒤쪽·태그에 넣으세요." : "대표 키워드 하나에 매달리기보다 작은 키워드를 여러 개 잡는 게 유리해요."}`
            : null
        }
        basis={`키워드 순위와 검색량을 로그 그래프에 놓으면 직선(멱법칙)이 나와요. 기울기 ${p.alpha} — 클수록 1등 키워드에 쏠림 (설명력 ${Math.round(p.fit * 100)}%)`}
      >
        <div className="dg-tail" aria-hidden="true">
          {p.bars.map((v, i) => (
            <i key={i} className={i < topN ? "h" : ""} style={{ height: `${Math.max(3, (v / p.bars[0]) * 100)}%` }} />
          ))}
        </div>
      </SciCard>
    );
  }

  if (s.niche?.length) {
    items.push(
      <SciCard
        key="ni"
        field="생태학 · 틈새 찾기"
        cls="bio"
        title="찾는 사람은 많은데 경쟁은 덜한 키워드"
        res={<>지금 노리기 좋은 키워드: <em>{s.niche.slice(0, 3).map((x) => x.keyword).join(" · ")}</em></>}
        so={s.niche.some((x) => x.inTitle === "none") ? "상품명에 '없음'으로 나온 키워드부터 상품명·태그·상세페이지 문구에 넣어 보세요." : "좋은 키워드는 이미 상품명에 들어 있어요. 지금처럼 유지하세요."}
        basis="생태계에서 먹이는 많고 경쟁자는 적은 빈자리를 찾듯, 알짜 점수 = 월 검색량 ÷ 경쟁 정도(높음 4·중간 2·낮음 1), 가장 좋은 키워드를 100점으로 환산"
      >
        <table className="dg-table">
          <thead><tr><th>키워드</th><th className="r">알짜 점수</th><th className="r">월 검색량</th><th className="r">경쟁</th><th className="r">상품명</th></tr></thead>
          <tbody>
            {s.niche.map((x) => (
              <tr key={x.keyword}><td>{x.keyword}</td><td className="r"><b>{x.index}</b></td><td className="r">{n0(x.volume)}</td><td className="r">{x.comp || "-"}</td><td className={`r ${IN[x.inTitle][0]}`}>{IN[x.inTitle][1]}</td></tr>
            ))}
          </tbody>
        </table>
      </SciCard>
    );
  }

  if (s.wave) {
    const w = s.wave;
    items.push(
      <SciCard
        key="wv"
        field="물리학 · 파동 분석"
        cls="phy"
        title="1년 중 언제 많이 찾나"
        res={
          <>
            <em>{w.peak}월</em>에 가장 많이 찾고 {w.trough}월에 가장 적어요 (최대 {w.amplitude}배 차이).{"\n"}{PHASE[w.phase] || ""}.
          </>
        }
        so={`${w.rise}월부터 찾는 사람이 늘기 시작해요. 상품명·상세페이지·광고 준비는 ${w.prepare}월 안에 끝내 두세요.${w.repeat != null ? (w.repeat >= 0.7 ? " 작년과 올해 흐름이 거의 같아서 믿을 만한 예측이에요." : w.repeat < 0.4 ? " 다만 해마다 흐름이 들쭉날쭉해서 참고용으로 보세요." : "") : ""}`}
        basis={`2년치 월별 검색량을 1년 주기의 파동으로 겹쳐 가장 높은 달·낮은 달·차이를 계산${w.repeat != null ? ` · 작년과 올해 같은 달끼리 닮은 정도(상관계수) ${w.repeat} (1에 가까울수록 같음)` : ""}`}
      />
    );
  }

  if (s.price) {
    const p = s.price;
    const m = s.priceMin;
    items.push(
      <SciCard
        key="pr"
        field="통계 · 가격 분포"
        title="내 가격, 비싼 편일까"
        res={
          <>
            검색 결과 상품을 싼 순서로 100개 세우면, 내 상품은 <em>{Math.max(1, p.pct)}번째</em>쯤이에요 ({p.zone === "고가대" ? "비싼 편" : p.zone === "저가대" ? "싼 편" : "중간"}).
            {m ? <>{"\n"}가장 싼 구성({won(s.restructure.base)}) 기준이면 <em>{Math.max(1, m.pct)}번째</em>예요.</> : null}
          </>
        }
        so={
          m && m.pct < p.pct - 15
            ? "실제로는 싸게 살 수 있는데 비싸 보이고 있어요. 위의 '가격 구조' 제안을 먼저 해보세요."
            : p.zone === "고가대"
              ? "비싼 편이니 첫 화면에서 '왜 이 가격인지'(소재·원산지·중량·후기)를 먼저 보여줘야 해요."
              : p.zone === "저가대"
                ? "싼 편이에요. 가격을 더 내리기보다 구성·혜택으로 한 번에 사는 금액을 올릴 여지가 있어요."
                : "가운데 가격이에요. 가격보다 리뷰·배송·구성으로 차이를 만드는 게 효과적이에요."
        }
        basis={`검색 결과 ${p.n}개 가격을 줄 세운 백분위 · 싼 쪽 25% ${won(p.q1)} · 가운데 ${won(p.med)} · 비싼 쪽 25% ${won(p.q3)}`}
      />
    );
  }

  if (s.ladder) {
    items.push(
      <SciCard
        key="ld"
        field="행동경제학 · 타협 효과"
        cls="eco"
        title="손님이 고르기 쉬운 묶음 구성"
        res={<>3개 중 고르라고 하면 손님은 <em>가운데</em>를 가장 많이 골라요.{"\n"}팔고 싶은 구성을 가운데에 두세요.</>}
        so="아래 가격은 예시예요. 원가·마진을 먼저 확인한 뒤 정하세요."
        basis="타협 효과 — 양 끝보다 중간 선택지를 안전하다고 느끼는 경향 (Simonson, 1989). 가장 비싼 묶음을 먼저 보여주면 가운데가 합리적으로 보여요."
      >
        <div className="dg-ladder">
          {s.ladder.map((x) => (
            <div key={x.label} className={x.target ? "t" : ""}>
              <small>{x.label}</small>
              <b>{won(x.price)}</b>
              <small>개당 {won(x.unit)}{x.off ? ` · ${x.off}% 할인` : ""}</small>
              <small>{x.ship ? `배송비 ${won(x.ship)}` : "무료배송"}</small>
            </div>
          ))}
        </div>
      </SciCard>
    );
  }

  if (s.motion && s.motion.points > 0) {
    const m = s.motion;
    items.push(
      m.need ? (
        <SciCard
          key="mo"
          field="물리학 · 속도와 가속도"
          cls="phy"
          title="순위가 오르고 있나"
          res={<>이번 순위({d.myRank ? `${d.myRank}위` : "기록됨"})를 저장해 뒀어요.{"\n"}같은 업체를 <em>{m.need}번 더</em> 진단하면 순위가 오르는 빠르기를 알려드려요.</>}
          so="검색 결과 화면도 함께 가져온 진단만 기록돼요. 1~2주 간격으로 다시 진단하면 '관리 효과'를 숫자로 보여줄 수 있어요."
        />
      ) : (
        <SciCard
          key="mo"
          field="물리학 · 속도와 가속도"
          cls="phy"
          title="순위가 오르고 있나"
          res={
            <>
              지금 {m.rank}위 · 1주에 <em>{m.velocity > 0 ? `${m.velocity}계단씩 오르는 중` : m.velocity < 0 ? `${-m.velocity}계단씩 내려가는 중` : "제자리"}</em>
              {m.velocity !== 0 ? (m.accel * Math.sign(m.velocity) > 0 ? "이고, 점점 빨라지고 있어요." : m.accel * Math.sign(m.velocity) < 0 ? "이고, 속도가 줄고 있어요." : "이에요.") : "이에요."}
            </>
          }
          basis="최근 3번 진단의 순위로 1주당 순위 변화(속도)와 그 변화가 커지는지(가속도)를 계산"
        />
      )
    );
  }

  if (!items.length) return null;
  return (
    <>
      <h2>🔬 데이터 과학 분석</h2>
      <p className="rp-note" style={{ marginTop: 0 }}>수학·통계·물리·생태학·행동경제학에서 쓰는 방법을 이 상품의 실제 숫자(검색량·검색 흐름·경쟁 가격·순위·옵션 가격)에 적용했어요. 결론은 쉬운 말로, 계산 방법은 각 칸 아래 작은 글씨로 적었어요.</p>
      <div className="dg-sci">{items}</div>
      <div className="dg-locked" style={{ marginTop: 10 }}>
        🔒 판매·리뷰 숫자가 몇 주 쌓이면 더 볼 수 있어요: 광고·이벤트 효과가 며칠 가는지 · 입소문이 퍼지는 중인지 · 상품명/썸네일을 바꾼 효과가 진짜인지
      </div>
    </>
  );
}

export default function DiagnoseView({ diag }) {
  const d = diag || {};
  const g = d.grade || {};
  const seasonMax = d.season ? Math.max(...d.season.avg, 1) : 1;
  return (
    <div className="rp">
      <style>{REPORT_CSS + DIAG_CSS}</style>
      <div className="rp-top">
        <span className="rp-agency">
          {d.agency || "고운기획"} <b>·</b> 스토어 페이지 분석
        </span>
        <span>{d.date}</span>
      </div>
      <h1>{d.store || "스토어"} 페이지 분석 결과</h1>
      <p className="rp-sub">
        {d.product ? `${d.product} · ` : ""}{d.keyword ? `대표 키워드 ‘${d.keyword}’ 기준 · ` : ""}스토어 실제 화면 기준으로 분석
      </p>

      <div className="dg-hero">
        <ScoreRing score={d.score || 0} />
        <div>
          <span className={`dg-badge dg-${g.tone || "warn"}`}>{g.label}</span>
          {d.headline && <h3>{d.headline}</h3>}
          {d.summary && <p>{L(d.summary)}</p>}
        </div>
      </div>

      {d.letter && (
        <div className="dg-letter">
          <p>{L(d.letter)}</p>
          <span>— {d.agency || "고운기획"} 드림</span>
        </div>
      )}

      {d.scope && (
        <div className="dg-scope">
          <b>이번 진단에서 살펴본 것</b>
          <div>
            <span>상품 페이지 전체</span>
            {d.scope.images > 0 && <span>상세 이미지 {d.scope.images}장</span>}
            {d.scope.competitors > 0 && <span>검색 결과 상위 {d.scope.competitors}개 상품</span>}
            {d.scope.ads > 0 && <span>검색 광고 {d.scope.ads}개</span>}
            {d.scope.reviewSignals > 0 && <span>리뷰 반응 {d.scope.reviewSignals}가지</span>}
            {d.scope.claims > 0 && <span>광고 문구 {d.scope.claims}개</span>}
            {d.scope.keywords > 0 && <span>연관 키워드 {d.scope.keywords}개</span>}
            {d.scope.trendMonths > 0 && <span>{d.scope.trendMonths}개월 검색 흐름</span>}
            <span>
              {d.scope.areas}개 영역 · {d.scope.checks}개 항목 점검
            </span>
          </div>
        </div>
      )}

      <Glance d={d} />

      <h2>📋 항목별 점수</h2>
      <div className="dg-areas">
        {(d.areas || []).map((a) => (
          <div className="dg-area" key={a.key}>
            <span>{a.label}</span>
            <div className="dg-bar">
              <i style={{ width: `${(a.score / a.max) * 100}%` }} />
            </div>
            <span className="s">
              {a.score}/{a.max}
            </span>
          </div>
        ))}
      </div>

      {(() => {
        const all = (d.areas || []).flatMap((a) => a.findings);
        const c = (l) => all.filter((f) => f.level === l).length;
        return all.length ? (
          <p className="dg-count">
            총 {all.length}개 항목 점검 · <i className="g">잘하고 있어요 {c("good")}</i> · <i className="w">보완 추천 {c("warn")}</i> · <i className="b">우선 개선 {c("bad")}</i>
          </p>
        ) : null;
      })()}

      {d.strengths?.length > 0 && (
        <>
          <h2>👍 지금 잘하고 계신 점</h2>
          <div className="dg-strengths">
            {d.strengths.map((x, i) => (
              <div key={i}>
                <b>{x.title}</b>
                <span>{L(x.detail)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {d.top3?.length > 0 && (
        <>
          <h2>🎯 가장 먼저 해보시면 좋은 3가지</h2>
          <div className="dg-top">
            {d.top3.map((t, i) => (
              <div className="dg-act" key={i}>
                <span className="no">{i + 1}</span>
                <span className="t">{t.title}</span>
                <span className="why">{L(t.why)}</span>
                <span className="how">{L(t.how)}</span>
                {t.impact && <span className="imp">기대 효과: {L(t.impact)}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {d.hidden?.length > 0 && (
        <>
          <h2>💡 한눈에 잘 보이지 않던 부분</h2>
          <div className="dg-hidden">
            {d.hidden.map((h, i) => (
              <div key={i}>
                <b>{h.title}</b>
                {L(h.detail)}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="dg-divider">
        <span>📑 상세 분석</span>
        <small>위 결론이 나온 근거와, 바로 쓸 수 있는 개선안이에요.</small>
      </div>

      {d.journey?.length > 0 && (
        <>
          <h2>🚶 손님이 어디서 빠져나가나</h2>
          <p className="rp-note" style={{ marginTop: 0 }}>검색해서 구매하기까지 4단계를 손님 입장에서 따라가 봤어요.</p>
          <div className="dg-journey">
            {d.journey.map((j, i) => (
              <div key={i} className={`dg-step dg-step-${j.status}`}>
                <div className="h">
                  <span className="n">{i + 1}</span>
                  <b>{j.step}</b>
                  <Badge level={j.status} />
                </div>
                <p>{L(j.comment)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {d.competitors?.length > 0 && (
        <>
          <h2>🥊 경쟁 상품과 비교</h2>
          <p className="rp-note" style={{ marginTop: 0 }}>‘{d.keyword}’ 검색 결과 상위 상품 (광고 제외)</p>
          <table className="dg-table dg-comp">
            <thead>
              <tr>
                <th>순위</th>
                <th>상품</th>
                <th className="r">가격</th>
                <th className="r">리뷰</th>
              </tr>
            </thead>
            <tbody>
              {d.competitors.map((c) => (
                <tr key={c.rank} className={c.me ? "me" : ""}>
                  <td>{c.rank}위</td>
                  <td>
                    <div className="ct">{c.title}</div>
                    <div className="cm">{c.me ? "★ 우리 상품" : c.mall}</div>
                  </td>
                  <td className="r">{c.price ? won(c.price) : "-"}</td>
                  <td className="r">{c.reviews != null ? Number(c.reviews).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {d.category?.top?.length > 0 && (
        <>
          <h2>🗂️ 카테고리 분석</h2>
          <div className="dg-cat">
            <div className="my">
              내 상품 카테고리: <b>{d.category.my || "읽지 못함"}</b>{" "}
              <span className={`dg-badge ${{ same: "dg-good", parent: "dg-warn", diff: "dg-bad" }[d.category.match] || "dg-warn"}`}>
                {{ same: "✓ 상위 상품과 같아요", parent: "세부 카테고리가 달라요", diff: "카테고리가 달라요", unknown: "확인 필요" }[d.category.match]}
              </span>
            </div>
            <p className="rp-note" style={{ margin: "2px 0" }}>‘{d.keyword}’ 검색 상위 {d.category.scanned}개 상품이 등록된 카테고리예요. 네이버는 검색어와 잘 맞는 카테고리의 상품을 먼저 보여줘요.</p>
            {d.category.top.map((t) => (
              <div key={t.path} className={`row ${t.mine || t.path === d.category.my ? "me" : ""}`}>
                <b>{t.path}{t.mine || t.path === d.category.my ? " ← 내 상품과 같은 카테고리" : ""}</b>
                <span className="bar"><i style={{ width: `${t.share}%` }} /></span>
                <span className="r">{t.share}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {d.price && (
        <>
          <h2>💰 가격 위치</h2>
          <PriceStrip price={d.price} />
        </>
      )}

      <KeywordVolume d={d} />

      {d.golden?.length > 0 && (
        <>
          <h2>🔑 노려볼 만한 키워드</h2>
          <p className="rp-note" style={{ marginTop: 0 }}>네이버 검색광고 데이터 기준, 검색은 꾸준한데 경쟁이 덜한 키워드예요. 상품에 맞는 것만 상품명·태그에 반영하세요.</p>
          <table className="dg-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th className="r">월 검색량</th>
                <th className="r">경쟁 정도</th>
              </tr>
            </thead>
            <tbody>
              {d.golden.map((k) => (
                <tr key={k.keyword}>
                  <td>{k.keyword}</td>
                  <td className="r">{Number(k.volume).toLocaleString()}</td>
                  <td className="r">{k.comp || (k.compRatio != null ? `상품 ${Number(k.products).toLocaleString()}개` : "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {d.season && (
        <>
          <h2>📅 시즌 (최근 2년 월별 검색 흐름)</h2>
          <div className="dg-season" role="img" aria-label="월별 검색 흐름">
            {d.season.avg.map((v, i) => (
              <div key={i} className={`${d.season.peaks.includes(i + 1) ? "pk" : ""} ${d.season.current === i + 1 ? "cur" : ""}`} title={`${i + 1}월 상대 검색량 ${Math.round(v)}`}>
                <i style={{ height: `${Math.max(4, (v / seasonMax) * 80)}px` }} />
                <span>{i + 1}월</span>
              </div>
            ))}
          </div>
          <p className="rp-note">
            주황 = 검색이 평소보다 25% 이상 많은 달
            {d.season.upcoming ? ` · ${d.season.upcoming}월 성수기가 다가와요. 지금 준비를 시작하세요.` : ""}
          </p>
        </>
      )}

      <Science d={d} />

      {d.ads && d.ads.waste?.length > 0 && (
        <>
          <h2>📉 광고비가 새는 키워드</h2>
          <table className="dg-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th className="r">클릭</th>
                <th className="r">광고비</th>
                <th className="r">구매</th>
              </tr>
            </thead>
            <tbody>
              {d.ads.waste.map((w) => (
                <tr key={w.keyword}>
                  <td>{w.keyword}</td>
                  <td className="r">{w.clk.toLocaleString()}</td>
                  <td className="r">{won(w.cost)}</td>
                  <td className="r">0건</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rp-note">판매 0건 키워드 합계 {won(d.ads.wasteCost)} · 전체 광고비의 {Math.round(d.ads.ratio * 100)}%</p>
        </>
      )}

      {d.titleOptions?.length > 0 && (
        <>
          <h2>✏️ 상품명 개선안</h2>
          <div className="dg-ba">
            <div className="before">
              <small>지금</small>
              {d.currentTitle}
            </div>
            {d.titleOptions.map((t, i) => (
              <div className="after" key={i}>
                <small>제안 {i + 1}</small>
                <b>{t.title}</b>
                <span>{L(t.point)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {(() => {
        const da = (d.areas || []).find((a) => a.key === "detail");
        if (!da?.findings?.length) return null;
        return (
          <>
            <h2>🔎 상세페이지 분석 <span className="dg-ref">참고용</span></h2>
            <p className="rp-note" style={{ marginTop: 0 }}>
              {d.detailBasis || "상세페이지"} 기준 · {da.score}/{da.max}점{da.label.includes("글 기준") ? " · 이미지를 못 받아 글자만 보고 판단했어요. 상세정보를 펼치고 끝까지 내린 뒤 버튼을 누르면 이미지까지 분석해요." : ""}
            </p>
            <div className="dg-find">
              {da.findings.map((f, i) => (
                <div className="dg-f" key={i}>
                  <span className="b">
                    <Badge level={f.level} />
                  </span>
                  <span className="t">{f.title}</span>
                  {f.detail && <span className="d">{L(f.detail)}</span>}
                  {f.fix && <span className="x">{L(f.fix)}</span>}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {d.detailPlan?.length > 0 && (
        <>
          <h2>🧩 추천 상세페이지 구성안 <span className="dg-ref">참고용</span></h2>
          <p className="rp-note" style={{ marginTop: 0 }}>
            {d.detailBasis ? `${d.detailBasis} 기준으로 짠 기획안이에요. ` : ""}위에서부터 이 순서로 보여주면 손님이 스크롤하면서 구매 이유를 차례로 얻어요.
          </p>
          <ol className="dg-plan">
            {d.detailPlan.map((p, i) => (
              <li key={i}>
                <b>{p.section}</b>
                {p.now && <span className="now">지금: {p.now}</span>}
                <span>{L(p.todo)}</span>
                {p.example && <q>{p.example}</q>}
              </li>
            ))}
          </ol>
          <p className="dg-refnote">※ 참고용 기획안이에요. 실제 제작할 때는 상품 특성·브랜드 분위기·촬영 여건에 맞게 순서와 문구를 조정하세요.</p>
        </>
      )}

      {d.reviews && (d.reviews.issues?.length > 0 || d.reviews.praise?.length > 0 || d.reviews.negatives?.length > 0 || d.reviews.scanned > 0) && (
        <>
          <h2>💬 리뷰가 말해주는 것</h2>
          {d.reviews.scanned > 0 && <p className="rp-note" style={{ marginTop: 0 }}>화면에서 리뷰 {d.reviews.scanned}개를 읽고 정리했어요.</p>}
          <div className="dg-rv">
            {d.reviews.praise?.length > 0 && (
              <div className="pos">
                <b>손님이 좋아하는 점</b>
                <ul>{d.reviews.praise.map((x, i) => <li key={i}>{x}</li>)}</ul>
                <small>→ 이 표현을 상세페이지 첫 화면과 대표 이미지 문구에 그대로 쓰세요.</small>
              </div>
            )}
            {d.reviews.issues?.length > 0 || d.reviews.negatives?.length > 0 ? (
              <div className="neg">
                <b>아쉬운 점 · 불만</b>
                {d.reviews.issues?.length > 0 && <ul>{d.reviews.issues.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                {d.reviews.negatives?.length > 0 && (
                  <div className="dg-negq">
                    {d.reviews.negatives.map((x, i) => (
                      <q key={i}>
                        {x.s != null && <i>★{x.s}</i>}
                        {x.q}
                      </q>
                    ))}
                  </div>
                )}
                <small>→ 아래 답글 예시처럼 답하고, 같은 불만이 안 나오게 상세페이지에 미리 안내하세요.</small>
              </div>
            ) : (
              <div className="neg">
                <b>아쉬운 점 · 불만</b>
                <small>읽은 리뷰에서는 불만이 보이지 않았어요.{"\n"}리뷰를 ‘평점 낮은순’으로 정렬한 뒤 다시 가져오면 숨은 불만까지 확인할 수 있어요.</small>
              </div>
            )}
          </div>
          {d.reviewReplies?.length > 0 && (
            <div className="dg-replies">
              {d.reviewReplies.map((r, i) => (
                <div key={i}>
                  <b>‘{r.issue}’ 리뷰 답글 예시</b>
                  <q>{r.reply}</q>
                  {r.fix && <span className="x">{L(r.fix)}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {d.offerIdeas?.length > 0 && (
        <>
          <h2>🎁 구성·혜택 개선 아이디어</h2>
          <p className="rp-note" style={{ marginTop: 0 }}>상품은 그대로 두고 '사는 이유'를 하나 더 만들어 주는 방법들이에요.</p>
          <div className="dg-ideas">
            {d.offerIdeas.map((o, i) => (
              <div key={i}>
                <b>{o.idea}</b>
                <span>{L(o.why)}</span>
                {o.how && <em>→ {L(o.how)}</em>}
              </div>
            ))}
          </div>
        </>
      )}

      {d.ad?.plan && (
        <>
          <h2>📣 광고, 이렇게 시작해 보세요</h2>
          <p className="dg-ad-sum">{L(d.ad.plan.summary)}</p>
          {d.ad.plan.start && (
            <div className="dg-ad-start">
              <b>시작 방법</b>
              <span>{L(d.ad.plan.start)}</span>
            </div>
          )}
          {(d.ad.plan.groups || []).map((g, gi) => {
            const rowOf = (k) => (d.ad.rows || []).find((r) => r.keyword.replace(/\s+/g, "") === String(k).replace(/\s+/g, ""));
            return (
              <div className="dg-ad-group" key={gi}>
                <div className="h">
                  <b>{g.name}</b>
                  <i>{g.channel}</i>
                </div>
                <p>{L(g.why)}</p>
                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>키워드</th>
                      {d.ad.hasData && <th className="r">월 검색</th>}
                      {d.ad.hasData && <th className="r">경쟁</th>}
                      {d.ad.hasData && <th className="r">예상 입찰가</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(g.keywords || []).map((k) => {
                      const r = rowOf(k);
                      return (
                        <tr key={k}>
                          <td>{k}</td>
                          {d.ad.hasData && <td className="r">{r ? Number(r.volume).toLocaleString() : "-"}</td>}
                          {d.ad.hasData && <td className="r">{r?.comp || "-"}</td>}
                          {d.ad.hasData && <td className="r">{r?.bid3 ? `${won(r.bid5 || r.bid3)}~${won(r.bid3)}` : "-"}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {d.ad.plan.negatives?.length > 0 && (
            <div className="dg-ad-neg">
              <b>제외 키워드로 등록하세요</b>
              <div>
                {d.ad.plan.negatives.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
              <small>상품과 관계없거나 구매 의도가 낮아서, 클릭만 나고 판매로 이어지기 어려운 검색어예요.</small>
            </div>
          )}
          {d.ad.perf?.some((p) => p.rows?.length) && (
            <>
              <h3 className="dg-h3">예상 입찰가별 한 달 예상 (모바일 파워링크)</h3>
              <table className="dg-table">
                <thead>
                  <tr>
                    <th>키워드</th>
                    <th className="r">입찰가</th>
                    <th className="r">노출</th>
                    <th className="r">클릭</th>
                    <th className="r">비용</th>
                  </tr>
                </thead>
                <tbody>
                  {d.ad.perf.flatMap((p) =>
                    (p.rows || []).map((r, i) => (
                      <tr key={p.keyword + i}>
                        <td>{i === 0 ? p.keyword : ""}</td>
                        <td className="r">{won(r.bid)}</td>
                        <td className="r">{Number(r.impressions).toLocaleString()}</td>
                        <td className="r">{Number(r.clicks).toLocaleString()}</td>
                        <td className="r">{won(r.cost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
          {d.ad.maxCpc && (
            <div className="dg-ad-start">
              <b>클릭당 얼마까지 써도 될까?</b>
              <span>
                광고비를 빼기 전 주문당 이익을 기준으로, 클릭한 손님 중 {d.ad.maxCpc.map((m) => `${m.conv}%가 사면 클릭당 ${won(m.cpc)}`).join(", ")}까지가 손해 보지 않는 선이에요.
              </span>
            </div>
          )}
          {d.ad.plan.checkpoints?.length > 0 && (
            <>
              <h3 className="dg-h3">2주 뒤 이것만 확인하세요</h3>
              <ul className="dg-check">
                {d.ad.plan.checkpoints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <p className="rp-note">
            {d.ad.hasData
              ? "검색량·경쟁·예상 입찰가는 네이버 검색광고 데이터 기준이에요. 예상 입찰가는 파워링크 모바일 3~5위 기준이며 실제 금액은 광고 품질에 따라 달라져요."
              : "검색량 데이터 없이 상품 화면 기준으로 작성했어요. 검색광고 계정을 연결하면 키워드별 검색량·예상 입찰가가 함께 나와요."}
          </p>
        </>
      )}

      <h2>🔍 상세 진단</h2>
      {(d.areas || []).map((a) => (
        <div key={a.key}>
          <div className="dg-area-h">
            <b>{a.label}</b>
            <span className="rp-note" style={{ margin: 0 }}>
              {a.score}/{a.max}점
            </span>
          </div>
          {a.note && <p className="dg-note">{L(a.note)}</p>}
          <div className="dg-find">
            {a.findings.map((f, i) => (
              <div className="dg-f" key={i}>
                <span className="b">
                  <Badge level={f.level} />
                </span>
                <span className="t">{f.title}</span>
                {f.detail && <span className="d">{L(f.detail)}</span>}
                {f.fix && <span className="x">{L(f.fix)}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {d.roadmap && ["today", "week", "month"].some((k) => d.roadmap[k]?.length) && (
        <>
          <h2>🗓️ 실행 로드맵</h2>
          <div className="dg-road">
            {[
              ["today", "오늘"],
              ["week", "이번 주"],
              ["month", "이번 달"],
            ].map(([k, label]) =>
              d.roadmap[k]?.length ? (
                <div key={k}>
                  <h4>{label}</h4>
                  {d.roadmap[k].map((t, i) => (
                    <div className="task" key={i}>
                      <span>{t.task}</span>
                      <span className="tags">
                        <i className={t.who === "대행" ? "who-a" : "who-o"}>{t.who === "대행" ? `${d.agency || "고운기획"}` : "사장님"}</i>
                        <i>{t.effort}</i>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        </>
      )}

      {d.offer?.length > 0 && (
        <>
          <h2>🤝 함께 진행할 수 있는 개선 작업</h2>
          <div className="dg-offer">
            {d.offer.map((o, i) => (
              <div key={i}>
                <b>{o.service}</b>
                <span>{L(o.solves)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="dg-cta">
        <b>더 좋은 스토어, 함께 만들어 가요</b>
        <span>
          진단 내용 중 궁금한 점이나 개선 방향은 언제든 편하게 물어봐 주세요. 상담은 무료예요.
          <br />
          {d.agency || "고운기획"}
          {d.contact ? ` · ${d.contact}` : ""}
        </span>
      </div>
      <p className="rp-note" style={{ textAlign: "center", marginTop: 14 }}>
        {d.date} 화면 기준 · 순위는 광고를 뺀 자연 순위이며 보는 사람·시간에 따라 조금 다를 수 있어요
      </p>
    </div>
  );
}
