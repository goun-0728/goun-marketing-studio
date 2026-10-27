// 🔬 데이터 과학 분석 — 진단에서 실제로 받은 숫자로만 계산 (비유만 하는 항목은 넣지 않음)
// 입력: 검색광고 키워드 목록, 검색어 트렌드, 검색 결과 가격, 순위 기록, 판매가

const compact = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const sum = (a) => a.reduce((x, y) => x + y, 0);
const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

// 상품명에 그 검색어가 들어 있나: 통째로(full) / 나눠서(split: '막창'+'구이'처럼 상품명 안 단어 조합) / 없음
export function titleMatch(title, keyword) {
  const t = compact(title);
  const k = compact(keyword);
  if (!k) return "none";
  if (t.includes(k)) return "full";
  // 키워드를 2글자 이상 조각으로 나눴을 때 조각이 모두 상품명 안에 있으면 '나눠서 있음'
  const ok = Array(k.length + 1).fill(false);
  ok[0] = true;
  for (let i = 0; i < k.length; i++) {
    if (!ok[i]) continue;
    for (let j = i + 2; j <= k.length; j++) if (t.includes(k.slice(i, j))) ok[j] = true;
  }
  return ok[k.length] ? "split" : "none";
}

// 상품과 관련 있는 키워드만 (상품명·대표 키워드와 2글자 이상 겹치고, 제외 키워드가 아닌 것)
export function relevantKeywords(list, title, main, negatives = []) {
  if (!list?.length) return [];
  const base = compact(title) + "|" + compact(main);
  const neg = new Set(negatives.map(compact));
  const shares = (k) => {
    for (let i = 0; i + 2 <= k.length; i++) if (base.includes(k.slice(i, i + 2))) return true;
    return false;
  };
  return list.filter((x) => !neg.has(compact(x.keyword)) && shares(compact(x.keyword)));
}

// 🔎 관련 키워드 월 검색량 표
export function keywordTable(rel, title, main) {
  const m = compact(main);
  return rel.map((k) => ({
    keyword: k.keyword,
    volume: k.volume,
    pc: k.pc ?? null,
    mobile: k.mobile ?? null,
    comp: k.comp || "",
    low: !!k.low,
    main: compact(k.keyword) === m,
    inTitle: titleMatch(title, k.keyword),
  }));
}

// 상품명이 관련 검색량을 얼마나 덮고 있나 (검색 커버율)
export function coverage(rows) {
  const total = sum(rows.map((r) => r.volume));
  if (!total) return null;
  const covered = sum(rows.filter((r) => r.inTitle !== "none").map((r) => r.volume));
  const missing = rows.filter((r) => r.inTitle === "none").sort((a, b) => b.volume - a.volume).slice(0, 3);
  return { total, covered, pct: round((covered / total) * 100), missing: missing.map((r) => ({ keyword: r.keyword, volume: r.volume })) };
}

// [수학] 멱법칙 · 롱테일 — 순위-검색량을 로그-로그 직선으로 맞춰 기울기(α)와 80:20 구조를 계산
export function powerLaw(rows, main) {
  const v = rows.map((r) => r.volume).filter((x) => x > 0).sort((a, b) => b - a);
  if (v.length < 8) return null;
  const xs = v.map((_, i) => Math.log(i + 1));
  const ys = v.map((x) => Math.log(x));
  const mx = sum(xs) / xs.length;
  const my = sum(ys) / ys.length;
  const slope = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sum(xs.map((x) => (x - mx) ** 2));
  const ssTot = sum(ys.map((y) => (y - my) ** 2));
  const ssRes = sum(ys.map((y, i) => (y - (my + slope * (xs[i] - mx))) ** 2));
  const total = sum(v);
  const top = Math.max(1, Math.ceil(v.length * 0.2));
  const top20 = sum(v.slice(0, top)) / total;
  const m = compact(main);
  const tail = rows.filter((r) => compact(r.keyword) !== m).sort((a, b) => b.volume - a.volume).slice(5);
  const easyTail = tail.filter((r) => r.comp === "낮음" || r.comp === "중간");
  const mainVol = rows.find((r) => compact(r.keyword) === m)?.volume || v[0];
  return {
    n: v.length,
    alpha: round(-slope, 2),
    fit: round(1 - ssRes / (ssTot || 1), 2),
    top20Share: round(top20 * 100),
    tailCount: easyTail.length,
    tailVolume: sum(easyTail.map((r) => r.volume)),
    tailVsMain: round((sum(easyTail.map((r) => r.volume)) / (mainVol || 1)) * 100),
    bars: v.slice(0, 30),
  };
}

// [생태학] 틈새(니치) 지수 — 검색량(먹이) ÷ 경쟁(경쟁자 수)으로 빈 서식지 찾기
const COMP_W = { 높음: 4, 중간: 2, 낮음: 1 };
export function niche(rows, main) {
  const m = compact(main);
  const scored = rows
    .filter((r) => compact(r.keyword) !== m && r.volume >= 50)
    .map((r) => ({ ...r, raw: r.volume / (COMP_W[r.comp] || 2) }));
  if (scored.length < 3) return null;
  const max = Math.max(...scored.map((r) => r.raw));
  return scored
    .map((r) => ({ keyword: r.keyword, volume: r.volume, comp: r.comp, inTitle: r.inTitle, index: Math.round((r.raw / max) * 100) }))
    .sort((a, b) => b.index - a.index)
    .slice(0, 5);
}

// [물리학] 파동 — 월별 검색 흐름의 주기·진폭·위상(지금 어디쯤인지)과 해마다 반복되는 정도(상관계수)
export function wave(trend, now = new Date()) {
  if (!trend?.length || trend.length < 12) return null;
  const byMonth = Array.from({ length: 12 }, () => []);
  const map = {};
  for (const t of trend) {
    const y = Number(t.period.slice(0, 4));
    const mo = Number(t.period.slice(5, 7));
    byMonth[mo - 1].push(t.ratio);
    map[`${y}-${mo}`] = t.ratio;
  }
  const avg = byMonth.map((a) => (a.length ? sum(a) / a.length : 0));
  const mean = sum(avg) / 12 || 1;
  const peak = avg.indexOf(Math.max(...avg)) + 1;
  const trough = avg.indexOf(Math.min(...avg)) + 1;
  // 성수기 직전 상승이 시작되는 달 (정점에서 거꾸로 따라가며 계속 오르던 구간의 시작)
  let rise = peak;
  for (let s = 0; s < 6; s++) {
    const prev = ((rise - 2 + 12) % 12) + 1;
    if (avg[prev - 1] < avg[rise - 1]) rise = prev;
    else break;
  }
  const prepare = ((rise - 2 + 12) % 12) + 1;
  // 해마다 같은 모양인가: 같은 달끼리 올해 vs 작년 상관계수
  const pairs = [];
  for (const k of Object.keys(map)) {
    const [y, mo] = k.split("-").map(Number);
    if (map[`${y + 1}-${mo}`] != null) pairs.push([map[k], map[`${y + 1}-${mo}`]]);
  }
  let repeat = null;
  if (pairs.length >= 6) {
    const a = pairs.map((p) => p[0]);
    const b = pairs.map((p) => p[1]);
    const ma = sum(a) / a.length;
    const mb = sum(b) / b.length;
    const cov = sum(a.map((x, i) => (x - ma) * (b[i] - mb)));
    const den = Math.sqrt(sum(a.map((x) => (x - ma) ** 2)) * sum(b.map((x) => (x - mb) ** 2)));
    repeat = den ? round(cov / den, 2) : null;
  }
  const cur = now.getMonth() + 1;
  const curV = avg[cur - 1];
  const nextV = avg[cur % 12];
  const phase = curV >= mean * 1.25 ? "정점 부근" : nextV > curV * 1.08 ? "상승기" : nextV < curV * 0.92 ? "하강기" : curV < mean * 0.8 ? "비수기" : "평탄기";
  return {
    avg: avg.map((x) => round(x, 1)),
    mean: round(mean, 1),
    peak,
    trough,
    amplitude: round(Math.max(...avg) / (Math.min(...avg) || 1), 1),
    rise,
    prepare,
    monthsToPeak: (peak - cur + 12) % 12,
    repeat,
    phase,
    current: cur,
  };
}

// [통계] 가격 위치 — 검색 결과 경쟁 가격 분포에서 내 가격의 백분위·표준점수
export function pricePosition(my, prices) {
  const p = (prices || []).filter((x) => x > 0).sort((a, b) => a - b);
  if (!my || p.length < 5) return null;
  const q = (r) => {
    const i = (p.length - 1) * r;
    const lo = Math.floor(i);
    return p[lo] + (p[Math.ceil(i)] - p[lo]) * (i - lo);
  };
  const mean = sum(p) / p.length;
  const sd = Math.sqrt(sum(p.map((x) => (x - mean) ** 2)) / p.length) || 1;
  const cheaper = p.filter((x) => x < my).length;
  const q1 = q(0.25);
  const q3 = q(0.75);
  return {
    n: p.length,
    pct: Math.round((cheaper / p.length) * 100),
    z: round((my - mean) / sd, 2),
    q1: Math.round(q1),
    med: Math.round(q(0.5)),
    q3: Math.round(q3),
    zone: my < q1 ? "저가대" : my > q3 ? "고가대" : "중간대",
  };
}

// [행동경제학] 타협 효과 — 선택지가 3개면 가운데를 고르는 경향 → 주력(2개 묶음)을 가운데에 두는 가격 사다리
export function priceLadder(price, shipFee = 0) {
  if (!price || price < 3000) return null;
  const end9 = (v) => Math.max(900, Math.ceil(v / 1000) * 1000 - 100);
  const two = end9(price * 2 * 0.9);
  const three = end9(price * 3 * 0.85);
  return [
    { label: "1개", price, unit: price, off: 0, ship: shipFee || 0 },
    { label: "2개 (주력)", price: two, unit: Math.round(two / 2), off: Math.round((1 - two / 2 / price) * 100), ship: 0, target: true },
    { label: "3개", price: three, unit: Math.round(three / 3), off: Math.round((1 - three / 3 / price) * 100), ship: 0 },
  ];
}

// [물리학] 순위 속도·가속도 — 진단할 때마다 쌓인 순위 기록으로 (주당 몇 계단, 빨라지는지)
export function rankMotion(hist) {
  const pts = (hist || []).filter((h) => h.best).map((h) => ({ t: new Date(h.t).getTime(), r: h.best }));
  if (pts.length < 3) return { need: 3 - pts.length, points: pts.length };
  const [a, b, c] = pts.slice(-3);
  const wk = 7 * 864e5;
  const v1 = (a.r - b.r) / Math.max(1 / 7, (b.t - a.t) / wk); // 양수 = 순위가 오름(숫자가 작아짐)
  const v2 = (b.r - c.r) / Math.max(1 / 7, (c.t - b.t) / wk);
  return { points: pts.length, rank: c.r, velocity: round(v2, 1), accel: round(v2 - v1, 1) };
}

// [행동경제학] 앵커링 — 손님은 처음 본 가격(검색 목록 가격)을 기준으로 비싸다/싸다를 판단
// 마이너스 옵션이 있으면 대표 가격을 가장 싼 구성으로 내리고, 나머지를 + 옵션으로 바꾼 표를 만듦
export function optionRestructure(price, optionPrices) {
  const list = (optionPrices || []).filter((o) => o && o.name && !o.soldOut);
  if (!price || list.length < 2) return null;
  const minD = Math.min(...list.map((o) => Number(o.delta) || 0));
  if (minD >= 0 || -minD < price * 0.1) return null;
  const base = price + minD;
  const groups = {};
  for (const o of list) {
    const d = Number(o.delta) || 0;
    (groups[d] = groups[d] || []).push(o.name);
  }
  const rows = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 6)
    .map((d) => ({ names: groups[d].slice(0, 3).join(", ") + (groups[d].length > 3 ? ` 외 ${groups[d].length - 3}개` : ""), now: d, after: d - minD, total: price + d }));
  return { price, base, rows, maxUp: Math.round(((price + Math.max(...list.map((o) => Number(o.delta) || 0)) - base) / base) * 100) };
}

// 모바일 검색 비중 (검색량 가중 평균)
export function mobileShare(rows) {
  const r = rows.filter((x) => x.pc != null && x.mobile != null);
  const t = sum(r.map((x) => x.pc + x.mobile));
  return t ? Math.round((sum(r.map((x) => x.mobile)) / t) * 100) : null;
}

// 진단 결과에 넣을 묶음
export function scienceBundle({ keywords, title, main, negatives, trend, my, prices, shipFee, rankHist, optionPrices, buyers }) {
  const restructure = optionRestructure(my, optionPrices);
  const rel = relevantKeywords(keywords, title, main, negatives);
  const table = keywordTable(rel, title, main);
  const mainRow = table.find((r) => r.main) || null;
  return {
    table: table.slice(0, 30),
    tableTotal: table.length,
    mainRow,
    coverage: coverage(table),
    mobile: mobileShare(table),
    power: powerLaw(table, main),
    niche: niche(table, main),
    wave: wave(trend),
    price: pricePosition(my, prices),
    priceMin: restructure ? pricePosition(restructure.base, prices) : null,
    restructure,
    // 옵션이 여러 개인 상품은 수량 묶음 사다리 대신 옵션 구조 제안을 보여줌
    ladder: (optionPrices || []).length >= 2 ? null : priceLadder(my, shipFee),
    motion: rankMotion(rankHist),
    long: longTrend(trend),
    buyers: buyerProfile(buyers),
    catWave: buyers?.catTrend?.length >= 12 ? wave(buyers.catTrend) : null,
  };
}

// [통계] 장기 흐름 — 5년치 월별 검색량으로 해마다 커지는 시장인지, 줄어드는 시장인지
export function longTrend(trend) {
  if (!trend?.length || trend.length < 24) return null;
  const byYear = {};
  for (const t of trend) {
    const y = t.period.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(Number(t.ratio) || 0);
  }
  const years = Object.keys(byYear)
    .sort()
    .map((y) => ({ year: y, avg: Math.round((byYear[y].reduce((a, b) => a + b, 0) / byYear[y].length) * 10) / 10, months: byYear[y].length }));
  // 최근 12개월 vs 그 전 12개월
  const last = trend.slice(-12).reduce((a, t) => a + t.ratio, 0);
  const prev = trend.slice(-24, -12).reduce((a, t) => a + t.ratio, 0);
  const yoy = prev ? Math.round(((last - prev) / prev) * 100) : null;
  const full = years.filter((y) => y.months >= 12);
  const first = full[0];
  const lastFull = full[full.length - 1];
  const total = first && lastFull && first !== lastFull && first.avg ? Math.round(((lastFull.avg - first.avg) / first.avg) * 100) : null;
  const dir = yoy == null ? "flat" : yoy >= 10 ? "up" : yoy <= -10 ? "down" : "flat";
  return { years, yoy, total, fromYear: first?.year, toYear: lastFull?.year, dir };
}

// 구매자 연령·성별·기기 (쇼핑인사이트) 정리
const AGE_LABEL = { 10: "10대", 20: "20대", 30: "30대", 40: "40대", 50: "50대", 60: "60대 이상" };
export function buyerProfile(b) {
  if (!b || (!b.ages?.length && !b.gender?.length)) return null;
  const ages = [...(b.ages || [])].sort((x, y) => Number(x.group) - Number(y.group)).map((a) => ({ ...a, label: AGE_LABEL[a.group] || a.group }));
  const topAge = [...ages].sort((x, y) => y.share - x.share)[0] || null;
  const f = (b.gender || []).find((g) => g.group === "f")?.share ?? null;
  const m = (b.gender || []).find((g) => g.group === "m")?.share ?? null;
  const mo = (b.device || []).find((g) => g.group === "mo")?.share ?? null;
  const gLabel = f != null && m != null ? (f >= 60 ? "여성" : m >= 60 ? "남성" : "남녀 비슷") : "";
  // 상위 두 연령대 합
  const top2 = [...ages].sort((x, y) => y.share - x.share).slice(0, 2);
  return {
    ages,
    female: f,
    male: m,
    mobile: mo,
    main: topAge ? `${topAge.label}${gLabel && gLabel !== "남녀 비슷" ? ` ${gLabel}` : ""}` : gLabel,
    mainShare: topAge?.share ?? null,
    top2: top2.map((a) => a.label),
    top2Share: Math.round(top2.reduce((s, a) => s + a.share, 0)),
    category: b.category,
  };
}
