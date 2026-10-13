// 고객에게 보여주는 월간 리포트 화면. 앱 안 미리보기, 공유 링크(/r), HTML 파일 모두 이 컴포넌트 하나로 그린다.
// 스타일을 컴포넌트 안에 포함 → outerHTML만 떼어내도 단독 파일로 동작.

import { monthLabel } from "@/lib/format";

export const REPORT_CSS = `
.rp{--ink:#1b1a17;--muted:#6f6b63;--line:#e8e4dc;--soft:#f7f5f1;--accent:#e8572a;--up:#1f8a4c;--down:#c0392b;
  font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  color:var(--ink);background:#fff;max-width:760px;margin:0 auto;padding:36px 22px 48px;line-height:1.6;font-size:15px}
.rp *{box-sizing:border-box}
.rp-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)}
.rp-agency{font-weight:800;color:var(--ink)}
.rp-agency b{color:var(--accent)}
.rp h1{font-size:28px;letter-spacing:-.02em;line-height:1.3;margin:22px 0 6px}
.rp-sub{color:var(--muted);margin:0 0 22px}
.rp-headline{background:var(--ink);color:#fff;border-radius:14px;padding:20px 22px;font-size:18px;font-weight:700;line-height:1.5}
.rp-summary{margin:14px 2px 0;white-space:pre-wrap}
.rp h2{font-size:17px;margin:34px 0 12px;padding-top:18px;border-top:1px solid var(--line)}
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.rp-kpi{background:var(--soft);border-radius:12px;padding:14px 16px}
.rp-kpi .l{font-size:12px;color:var(--muted);font-weight:700}
.rp-kpi .v{font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:2px}
.rp-kpi .d{font-size:13px;font-weight:700}
.rp-up{color:var(--up)} .rp-down{color:var(--down)} .rp-flat{color:var(--muted)}
.rp-ranks{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.rp-rank{border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.rp-rank .k{font-weight:800}
.rp-rank .nums{display:flex;align-items:baseline;gap:8px;margin:2px 0 6px}
.rp-rank .now{font-size:22px;font-weight:800}
.rp-rank .from{font-size:13px;color:var(--muted)}
.rp-rank svg{display:block;width:100%;height:56px}
.rp-rank .axis{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}
.rp-list{list-style:none;padding:0;margin:0}
.rp-list li{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);align-items:baseline}
.rp-tag{font-size:12px;font-weight:700;background:#fdeee8;color:var(--accent);border-radius:6px;padding:1px 8px;white-space:nowrap}
.rp-list .t{flex:1;min-width:0}
.rp-list .t a{color:var(--ink)}
.rp-list .dt{font-size:12px;color:var(--muted);white-space:nowrap}
.rp-counts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.rp-counts span{background:var(--soft);border-radius:99px;padding:4px 12px;font-size:13px}
.rp-counts b{color:var(--accent)}
.rp-plan{counter-reset:p;list-style:none;padding:0;margin:0}
.rp-plan li{counter-increment:p;position:relative;padding:8px 0 8px 36px}
.rp-plan li:before{content:counter(p);position:absolute;left:0;top:8px;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}
.rp-wins li:before{content:"✓";background:var(--up)}
.rp-foot{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);text-align:center}
.rp-note{font-size:12px;color:var(--muted);margin-top:8px}
@media (max-width:520px){.rp{padding:24px 16px 40px}.rp h1{font-size:23px}}
`;

const fmt = (n, unit) => {
  if (n === "" || n === null || n === undefined || isNaN(Number(n))) return "-";
  const v = Number(n);
  if (unit === "원") return v >= 10000 ? `${(v / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : `${v.toLocaleString()}원`;
  if (unit === "%") return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
  return `${v.toLocaleString()}${unit || ""}`;
};

function KpiDelta({ cur, prev, lowerIsBetter }) {
  const c = Number(cur);
  const p = Number(prev);
  if (!prev || !p || isNaN(c)) return <div className="d rp-flat">지난달 기록 없음</div>;
  const pct = ((c - p) / p) * 100;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  if (Math.abs(pct) < 0.5) return <div className="d rp-flat">지난달과 비슷</div>;
  return (
    <div className={`d ${good ? "rp-up" : "rp-down"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% <span className="rp-flat">(지난달 대비)</span>
    </div>
  );
}

// 순위 미니 차트: 1위가 위쪽. 단일 시리즈라 범례 없음, 점마다 툴팁.
function RankChart({ points }) {
  const ranked = points.filter((p) => p.r);
  if (ranked.length < 2) return null;
  const W = 220;
  const H = 56;
  const pad = 6;
  const max = Math.max(...ranked.map((p) => p.r));
  const min = Math.min(...ranked.map((p) => p.r));
  const x = (i) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (r) => (max === min ? H / 2 : pad + ((r - min) / (max - min)) * (H - pad * 2));
  const coords = points.map((p, i) => (p.r ? [x(i), y(p.r), p] : null)).filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="순위 추이">
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="#e8e4dc" strokeWidth="1" />
      <polyline points={coords.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" stroke="#e8572a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {coords.map(([a, b, p], i) => (
        <circle key={i} cx={a} cy={b} r={i === coords.length - 1 ? 4 : 2.5} fill="#e8572a" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
          <title>{`${p.d.replace("-", "/")} · ${p.r}위`}</title>
        </circle>
      ))}
    </svg>
  );
}

function RankCard({ r }) {
  const diff = r.start && r.end ? r.start - r.end : 0;
  return (
    <div className="rp-rank">
      <div className="k">{r.keyword}</div>
      <div className="nums">
        <span className="now">{r.end ? `${r.end}위` : "권외"}</span>
        {r.start && r.end && r.start !== r.end && (
          <span className={diff > 0 ? "rp-up" : "rp-down"} style={{ fontWeight: 700, fontSize: 14 }}>
            {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
          </span>
        )}
        <span className="from">월초 {r.start ? `${r.start}위` : "권외"}{r.best ? ` · 최고 ${r.best}위` : ""}</span>
      </div>
      <RankChart points={r.points} />
      {r.points.length > 1 && (
        <div className="axis">
          <span>{r.points[0].d.replace("-", "/")}</span>
          <span>{r.points[r.points.length - 1].d.replace("-", "/")}</span>
        </div>
      )}
    </div>
  );
}

export default function ReportView({ report }) {
  const r = report || {};
  const kpis = (r.kpis || []).filter((k) => k.cur !== "" && k.cur !== undefined && k.cur !== null);
  const works = r.works || [];
  const counts = works.reduce((a, w) => ({ ...a, [w.type]: (a[w.type] || 0) + 1 }), {});

  return (
    <div className="rp">
      <style>{REPORT_CSS}</style>
      <div className="rp-top">
        <span className="rp-agency">
          {r.agency || "고운기획"} <b>·</b> 월간 마케팅 리포트
        </span>
        <span>{r.createdAt}</span>
      </div>
      <h1>{r.store || "스토어"} {monthLabel(r.month)} 리포트</h1>
      <p className="rp-sub">이번 달 무엇을 했고, 무엇이 달라졌는지 한눈에 정리했어요.</p>

      {r.headline && <div className="rp-headline">{r.headline}</div>}
      {r.summary && <p className="rp-summary">{r.summary}</p>}

      {kpis.length > 0 && (
        <>
          <h2>📊 핵심 숫자</h2>
          <div className="rp-kpis">
            {kpis.map((k) => (
              <div className="rp-kpi" key={k.label}>
                <div className="l">{k.label}</div>
                <div className="v">{fmt(k.cur, k.unit)}</div>
                <KpiDelta cur={k.cur} prev={k.prev} lowerIsBetter={k.lowerIsBetter} />
              </div>
            ))}
          </div>
        </>
      )}

      {r.ranks?.length > 0 && (
        <>
          <h2>📈 네이버 쇼핑 순위</h2>
          <div className="rp-ranks">
            {r.ranks.map((x) => (
              <RankCard key={x.keyword} r={x} />
            ))}
          </div>
          <p className="rp-note">광고 제외 자연 검색 기준 · 하루 마지막 측정값 · 숫자가 작을수록 상위</p>
        </>
      )}

      {r.wins?.filter(Boolean).length > 0 && (
        <>
          <h2>🏆 이번 달 성과</h2>
          <ol className="rp-plan rp-wins">
            {r.wins.filter(Boolean).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ol>
        </>
      )}

      {works.length > 0 && (
        <>
          <h2>🛠️ 이번 달 진행한 작업 ({works.length}건)</h2>
          <div className="rp-counts">
            {Object.entries(counts).map(([t, n]) => (
              <span key={t}>
                {t} <b>{n}</b>
              </span>
            ))}
          </div>
          <ul className="rp-list">
            {works.map((w, i) => (
              <li key={i}>
                <span className="rp-tag">{w.type}</span>
                <span className="t">
                  {w.link ? (
                    <a href={w.link} target="_blank" rel="noreferrer">
                      {w.title}
                    </a>
                  ) : (
                    w.title
                  )}
                </span>
                <span className="dt">{(w.date || "").slice(5).replace("-", "/")}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {r.nextPlan?.filter(Boolean).length > 0 && (
        <>
          <h2>🗓️ 다음 달 계획</h2>
          <ol className="rp-plan">
            {r.nextPlan.filter(Boolean).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </>
      )}

      <div className="rp-foot">
        {r.agency || "고운기획"}
        {r.contact ? ` · ${r.contact}` : ""}
        <br />
        궁금한 점은 언제든 편하게 연락 주세요.
      </div>
    </div>
  );
}
