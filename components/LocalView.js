// 🏪 오프라인 가게 분석·전략 보고서 화면 (앱 미리보기 · PDF/HTML 공용)
const CSS = `
.lc{--ink:#1b1a17;--muted:#6f6b63;--line:#e8e4dc;--soft:#f7f5f1;--accent:#e8572a;font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:var(--ink);max-width:780px;margin:0 auto;padding:28px 20px 40px;line-height:1.7;font-size:15px;word-break:keep-all}
.lc *{box-sizing:border-box}
.lc-top{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);border-bottom:3px solid var(--ink);padding-bottom:8px}
.lc-top b{color:var(--ink)} .lc-top b i{color:var(--accent);font-style:normal}
.lc h1{font-size:25px;margin:18px 0 2px;letter-spacing:-.02em}
.lc .sub{color:var(--muted);margin:0 0 14px;font-size:14px}
.lc h2{font-size:17px;margin:26px 0 10px;padding-top:14px;border-top:1px solid var(--line)}
.lc .hero{background:var(--soft);border-radius:14px;padding:16px 18px}
.lc .hero b{font-size:18px;display:block;margin-bottom:4px}
.lc .note{font-size:12px;color:var(--muted)}
.lc table{width:100%;border-collapse:collapse;font-size:14px}
.lc th{text-align:left;font-size:12px;color:var(--muted);padding:6px 4px;border-bottom:2px solid var(--line);white-space:nowrap}
.lc td{padding:8px 4px;border-bottom:1px solid var(--line);vertical-align:top}
.lc td.r,.lc th.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.lc tr.me td{background:#fdeee8;font-weight:700}
.lc .bar{display:inline-block;height:7px;border-radius:99px;background:#d6d0c6;vertical-align:middle;margin-left:6px}
.lc tr.me .bar{background:var(--accent)}
.lc .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.lc .two>div{border-radius:12px;padding:12px 14px;font-size:14px}
.lc .good{background:#f3faf5;border:1px solid #cfe8d8} .lc .warn{background:#fff8ec;border:1px solid #f3e2bf}
.lc ul{margin:6px 0 0;padding-left:18px}
.lc .chk{display:flex;flex-direction:column;gap:8px}
.lc .chk>div{border-left:3px solid var(--accent);padding:4px 0 4px 12px;font-size:14px}
.lc .chk span{display:block;color:var(--muted);font-size:13px}
.lc .chk em{font-style:normal;font-size:11px;font-weight:800;border-radius:5px;padding:1px 7px;margin-left:6px;background:#fdf3dc;color:#8a5a00}
.lc .chk .st-good{border-left-color:#1f8a4c} .lc .chk .st-good em{background:#e7f4ec;color:#1f7a45}
.lc .chk .st-missing em{background:#fdeaea;color:#b4232f}
.lc .chk .st-check{border-left-color:#c9c3b8} .lc .chk .st-check em{background:#eeeae3;color:#5c584f}
.lc .tags{display:flex;flex-wrap:wrap;gap:6px}
.lc .tags span{background:#fdeee8;color:var(--accent);border-radius:6px;padding:3px 8px;font-size:13px;font-weight:700}
.lc .tags i{font-style:normal;color:var(--muted);font-weight:600;margin-left:4px}
.lc .cal{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.lc .cal>div{border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px}
.lc .cal b{display:block;margin-bottom:4px}
.lc .week{background:#1b1a17;color:#fff;border-radius:12px;padding:14px 18px}
.lc .week li{margin:4px 0}
.lc .foot{margin-top:30px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);text-align:center}
@media print{.lc h2{break-after:avoid}.lc .two>div,.lc .cal>div,.lc tr,.lc .hero,.lc .week{break-inside:avoid}}
`;

const n0 = (v) => (v == null ? "-" : Number(v).toLocaleString());

export default function LocalView({ r }) {
  if (!r) return null;
  const b = r.data || {};
  const a = r.ai || {};
  const rows = [
    ...(b.myBlog != null ? [{ name: r.name || "우리 가게", category: b.me?.category || "", blog: b.myBlog, me: true }] : []),
    ...(b.competitors || []).map((c) => ({ ...c, me: false })),
  ].sort((x, y) => (y.blog ?? -1) - (x.blog ?? -1));
  const max = Math.max(1, ...rows.map((x) => x.blog || 0));
  return (
    <div className="lc">
      <style>{CSS}</style>
      <div className="lc-top">
        <b>{r.agency || "고운기획"} <i>·</i> 우리 동네 가게 분석</b>
        <span>{r.date}</span>
      </div>
      <h1>{r.name || "우리 가게"} 동네 마케팅 전략</h1>
      <p className="sub">‘{b.query}’ 기준 · 네이버 지역 검색·블로그·검색어 데이터로 분석 · 월 예산 {r.budget}</p>

      <div className="hero">
        {a.headline && <b>{a.headline}</b>}
        {a.summary && <span>{a.summary}</span>}
      </div>

      {rows.length > 0 && (
        <>
          <h2>📍 동네 경쟁 가게와 블로그 언급 수</h2>
          <table>
            <thead><tr><th>가게</th><th>분류</th><th className="r">블로그 언급</th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.name} className={x.me ? "me" : ""}>
                  <td>{x.name}{x.me ? " (우리)" : x.reviewRank ? ` · 리뷰 많은 순 ${x.reviewRank}위` : ""}</td>
                  <td>{x.category}</td>
                  <td className="r">{n0(x.blog)}<i className="bar" style={{ width: `${Math.max(2, ((x.blog || 0) / max) * 60)}px` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            ‘가게 이름 + {b.town}’으로 네이버 블로그를 검색한 글 수예요. 손님이 가기 전에 찾아보는 후기 양이라고 보면 돼요.
            {b.blogRank ? ` 우리 가게는 ${b.blogOf}곳 중 ${b.blogRank}위` : ""}
            {b.myRecent90 != null ? ` · 최근 3개월 새 글 ${b.myRecent90}개(최근 30개 중)` : ""}
            {!b.me ? " · 네이버 지역 검색에서 우리 가게를 찾지 못했어요. 플레이스 등록·가게 이름을 확인해 주세요." : ""}
          </p>
        </>
      )}

      {(a.strengths?.length > 0 || a.gaps?.length > 0) && (
        <div className="two" style={{ marginTop: 12 }}>
          {a.strengths?.length > 0 && <div className="good"><b>잘하고 있는 점</b><ul>{a.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {a.gaps?.length > 0 && <div className="warn"><b>경쟁 가게보다 부족한 점</b><ul>{a.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
      )}

      {!a.place?.length && !r.placeAt && (
        <>
          <h2>🗺️ 네이버 플레이스 점검</h2>
          <p className="note" style={{ marginTop: 0 }}>이번 분석은 가게 플레이스 화면 없이 만들어서 점검을 빼 두었어요. 가게 이름을 네이버에서 검색한 화면에서 '고운 진단' 버튼을 누른 뒤 다시 분석하면, 실제 등록 상태(사진·메뉴·소식·리뷰 답글 등)를 보고 점검해 드려요.</p>
        </>
      )}

      {a.place?.length > 0 && (
        <>
          <h2>🗺️ 네이버 플레이스 점검</h2>
          {r.placeAt ? <p className="note" style={{ marginTop: 0 }}>가게 플레이스 화면({r.placeAt})을 직접 보고 점검했어요.</p> : <p className="note" style={{ marginTop: 0 }}>플레이스 화면을 가져오지 않아 '확인해 보세요' 목록으로 정리했어요.</p>}
          <div className="chk">
            {a.place.map((p, i) => (
              <div key={i} className={`st-${p.status || "check"}`}>
                <b>{p.item} <em>{{ good: "✓ 잘 되어 있어요", warn: "보완 추천", missing: "추가 필요", check: "확인해 보세요" }[p.status] || "확인해 보세요"}</em></b>
                <span>{p.why}</span>
                {p.status !== "good" && p.todo}
              </div>
            ))}
          </div>
        </>
      )}

      {a.keywords?.length > 0 && (
        <>
          <h2>🔑 동네 손님이 검색하는 단어</h2>
          <div className="tags">
            {a.keywords.map((k) => <span key={k.keyword}>{k.keyword}<i>{k.volume && k.volume !== "-" ? `월 ${n0(k.volume)}` : ""} · {k.use}</i></span>)}
          </div>
          {b.season && <p className="note">‘{b.query}’ 검색은 {b.season.peak}월에 가장 많고 {b.season.trough}월에 가장 적어요{b.long?.yoy != null ? ` · 최근 1년 검색은 전년보다 ${b.long.yoy >= 0 ? `${b.long.yoy}% 늘었어요` : `${-b.long.yoy}% 줄었어요`}` : ""}.</p>}
        </>
      )}

      {b.buzz?.topTitles?.length > 0 && (
        <>
          <h2>📝 ‘{b.query}’ 블로그 상위 글은 이런 모양이에요</h2>
          <div className="tags">{b.buzz.words.slice(0, 10).map((x) => <span key={x.w}>{x.w}<i>{x.n}</i></span>)}</div>
          <p className="note">상위 글 유형: {b.buzz.types.filter((t) => t.n).map((t) => `${t.name} ${t.share}%`).join(" · ") || "-"}{b.buzz.empty.length ? ` · 빈자리: ${b.buzz.empty.join(", ")}` : ""}{b.buzz.questions.length ? ` · 지식iN 질문 예: ${b.buzz.questions.slice(0, 2).join(" / ")}` : ""}</p>
        </>
      )}

      {a.channels?.length > 0 && (
        <>
          <h2>📣 채널 우선순위</h2>
          <table>
            <thead><tr><th>순위</th><th>채널</th><th>왜</th><th>주간 운영</th><th className="r">비용</th></tr></thead>
            <tbody>{a.channels.map((c, i) => <tr key={i}><td>{c.priority}</td><td><b>{c.channel}</b></td><td>{c.why}</td><td>{c.weekly}</td><td className="r">{c.cost}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {a.calendar?.length > 0 && (
        <>
          <h2>🗓️ 4주 실행 계획</h2>
          <div className="cal">{a.calendar.map((w, i) => <div key={i}><b>{w.week}</b><ul>{(w.todo || []).map((t, j) => <li key={j}>{t}</li>)}</ul></div>)}</div>
        </>
      )}

      {a.budget?.length > 0 && (
        <>
          <h2>💰 예산 배분</h2>
          <table><tbody>{a.budget.map((x, i) => <tr key={i}><td><b>{x.item}</b></td><td>{x.why}</td><td className="r">{x.amount}</td></tr>)}</tbody></table>
        </>
      )}

      {a.kpis?.length > 0 && (
        <>
          <h2>📏 4주 뒤 확인할 숫자</h2>
          <table>
            <thead><tr><th>지표</th><th className="r">지금</th><th className="r">목표</th><th>확인 위치</th></tr></thead>
            <tbody>{a.kpis.map((k, i) => <tr key={i}><td>{k.metric}</td><td className="r">{k.now}</td><td className="r"><b>{k.target}</b></td><td>{k.where}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {a.ideas?.length > 0 && (
        <>
          <h2>💡 바로 쓸 콘텐츠 아이디어</h2>
          <ul>{a.ideas.map((x, i) => <li key={i}><b>{x.channel}</b> · {x.idea}</li>)}</ul>
        </>
      )}

      {a.thisWeek?.length > 0 && (
        <>
          <h2>✅ 이번 주 바로 할 일</h2>
          <div className="week"><ul>{a.thisWeek.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </>
      )}

      <div className="foot">{r.agency || "고운기획"}{r.contact ? ` · ${r.contact}` : ""} · 네이버 공개 검색 데이터 기준 참고용 분석이에요</div>
    </div>
  );
}
