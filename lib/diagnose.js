// 스토어 정밀 진단 엔진 — 순수 계산 함수 (브라우저/서버/테스트 공용)
// 점수는 규칙으로 계산해서 매번 같은 입력이면 같은 결과가 나오게 한다. AI는 설명·상세페이지만 담당.

const won = (n) => `${Math.round(n).toLocaleString()}원`;
const pct = (n) => `${Math.round(n * 100)}%`;
const F = (level, title, detail, fix) => ({ level, title, detail, fix });

// ---------- 공통 ----------
export function tokenize(title) {
  return String(title || "")
    .replace(/[\[\](){}<>【】「」『』"'|/\\,·~!?※★☆♥+]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

export function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ---------- 1. 상품명 ----------
export function analyzeTitle(title, keyword, topItems) {
  const max = 25;
  let score = max;
  const findings = [];
  const t = String(title || "").trim();
  if (!t) return null;
  const compact = (s) => s.replace(/\s+/g, "");
  const kwIdx = compact(t).indexOf(compact(keyword));

  if (kwIdx < 0) {
    score -= 7;
    findings.push(F("bad", `대표 키워드 '${keyword}'가 상품명에 없어요`, "네이버는 상품명에 검색어가 들어 있는 상품을 우선 보여줘요.", `상품명 앞부분에 '${keyword}'를 그대로 넣으세요.`));
  } else if (kwIdx > 15) {
    score -= 3;
    findings.push(F("warn", "대표 키워드가 상품명 뒤쪽에 있어요", `현재 ${kwIdx + 1}번째 글자부터 시작해요. 모바일 검색 결과에선 상품명 앞부분만 보여요.`, `'${keyword}'를 상품명 맨 앞 15자 안으로 옮기세요.`));
  } else {
    findings.push(F("good", "대표 키워드가 상품명 앞쪽에 있어요", "", ""));
  }

  const len = t.length;
  if (len > 50) {
    score -= 3;
    findings.push(F("warn", `상품명이 너무 길어요 (${len}자)`, "50자를 넘기면 키워드 나열로 보일 수 있고 모바일에서 잘려요.", "중복·수식어를 빼고 50자 이내로 줄이세요."));
  } else if (len < 15) {
    score -= 2;
    findings.push(F("warn", `상품명이 너무 짧아요 (${len}자)`, "검색에 걸릴 수 있는 단어가 부족해요.", "용량·구성·특징 단어를 더해 25~45자로 만드세요."));
  }

  const toks = tokenize(t);
  const dup = [...new Set(toks.filter((w, i) => toks.indexOf(w) !== i))];
  if (dup.length) {
    score -= 2;
    findings.push(F("warn", `같은 단어가 반복돼요: ${dup.join(", ")}`, "반복은 검색 점수에 도움이 안 되고 어뷰징으로 보일 수 있어요.", "한 번씩만 쓰고 남는 자리에 다른 검색어를 넣으세요."));
  }

  // 상위 상품들이 공통으로 쓰는데 내 상품명엔 없는 단어
  if (topItems?.length >= 10) {
    const freq = {};
    for (const it of topItems) for (const w of new Set(tokenize(it.title))) freq[w] = (freq[w] || 0) + 1;
    const mine = new Set(toks.map((x) => x.toLowerCase()));
    const kwToks = new Set(tokenize(keyword).map((x) => x.toLowerCase()));
    const missing = Object.entries(freq)
      .filter(([w, n]) => n / topItems.length >= 0.2 && !mine.has(w.toLowerCase()) && !kwToks.has(w.toLowerCase()) && !compact(t).includes(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    if (missing.length) {
      score -= Math.min(8, missing.length * 2);
      findings.push(
        F(
          missing.length >= 3 ? "bad" : "warn",
          `상위 상품들이 쓰는 단어 ${missing.length}개가 빠져 있어요`,
          missing.map(([w, n]) => `'${w}' (상위 ${topItems.length}개 중 ${n}개 사용)`).join(", "),
          "상품에 해당하는 단어만 골라 상품명에 넣으세요. 해당 안 되는 단어를 넣으면 오히려 감점이에요."
        )
      );
    }
  }
  return { key: "title", label: "상품명 · 키워드", max, score: Math.max(0, score), findings };
}

// ---------- 2. 노출 (순위·카테고리) ----------
export function analyzeExposure(market, myCategory) {
  const max = 15;
  if (!market) return null;
  const findings = [];
  let score;
  const r = market.myRank;
  const page = r ? Math.ceil(r / 40) : null;
  if (!r) {
    score = 2;
    findings.push(F("bad", `'${market.keyword}' 검색 ${market.scanned}위 안에 상품이 없어요`, "고객 대부분은 2~3페이지 이후로 넘기지 않아요. 지금은 검색으로 거의 발견되지 않는 상태예요.", "상품명·카테고리를 먼저 고치고, 경쟁이 덜한 세부 키워드로 순위를 만든 뒤 대표 키워드에 도전하세요."));
  } else if (r <= 40) {
    score = 15;
    findings.push(F("good", `1페이지 노출 중 (${r}위)`, "", ""));
  } else if (r <= 120) {
    score = 11;
    findings.push(F("warn", `${page}페이지 (${r}위)`, "1페이지와 2~3페이지는 클릭 수 차이가 커요.", "리뷰·찜·판매 실적을 쌓으면 1페이지 진입 가능성이 높은 구간이에요."));
  } else {
    score = 6;
    findings.push(F("bad", `${page}페이지 (${r}위)`, "이 순위에선 검색 유입이 거의 없어요.", "대표 키워드보다 경쟁이 적은 세부 키워드 순위부터 올리세요."));
  }

  // 카테고리: 상위 40개가 가장 많이 쓰는 카테고리와 비교
  const cats = {};
  for (const it of market.top) if (it.category) cats[it.category] = (cats[it.category] || 0) + 1;
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const share = topCat[1] / market.top.length;
    const myCat = String(myCategory || market.mine?.[0]?.category || "");
    const leaf = topCat[0].split(" > ").pop();
    if (myCat && !myCat.replace(/\s/g, "").includes(leaf.replace(/\s/g, ""))) {
      score -= 4;
      findings.push(F("bad", "상위 상품들과 카테고리가 달라요", `상위 ${market.top.length}개 중 ${pct(share)}가 '${topCat[0]}'에 있어요. 내 상품: '${myCat}'.`, `카테고리를 '${topCat[0]}'로 바꾸는 걸 검토하세요. 네이버는 검색어마다 선호 카테고리가 있어요.`));
    } else if (myCat) {
      findings.push(F("good", "주력 카테고리가 상위 상품과 같아요", `'${topCat[0]}' (상위 ${pct(share)})`, ""));
    }
  }

  // 가격비교(카탈로그) 비중
  // productType 1 = 가격비교(카탈로그) 상품 자체 (판매처가 '네이버'로 표시됨)
  const catalog = market.top.filter((x) => x.productType === 1).length;
  if (catalog / Math.max(market.top.length, 1) >= 0.3) {
    findings.push(F("warn", "이 키워드는 가격비교(카탈로그) 상품이 많아요", `상위 ${market.top.length}개 중 ${catalog}개가 가격비교 묶음이에요.`, "같은 상품이 가격비교로 묶일 수 있다면 카탈로그 매칭을 신청하고, 아니라면 구성·용량을 달리해 단독 상품으로 차별화하세요."));
  }
  return { key: "exposure", label: "검색 노출", max, score: Math.max(0, score), findings };
}

// ---------- 3. 가격 ----------
export function analyzePrice(price, market) {
  const max = 15;
  const prices = (market?.top || []).map((x) => x.price).filter((p) => p > 0).sort((a, b) => a - b);
  if (!price || prices.length < 5) return null;
  const p25 = quantile(prices, 0.25);
  const med = quantile(prices, 0.5);
  const p75 = quantile(prices, 0.75);
  const below = prices.filter((p) => p < price).length / prices.length;
  const findings = [];
  let score;
  if (below <= 0.6) {
    score = 15;
    findings.push(F("good", `가격이 상위 상품 중 ${below < 0.3 ? "낮은" : "중간"} 편이에요`, `내 가격 ${won(price)} · 상위 ${prices.length}개 중앙값 ${won(med)}`, ""));
  } else if (below <= 0.85) {
    score = 10;
    findings.push(F("warn", "가격이 상위 상품보다 다소 높아요", `내 가격 ${won(price)}은 상위 ${prices.length}개 중 ${pct(below)}보다 비싸요. (중앙값 ${won(med)})`, "가격을 내리기보다 용량·구성·사은품으로 '왜 더 비싼지'를 대표이미지와 상품명에서 바로 보여주세요."));
  } else {
    score = 5;
    findings.push(F("bad", "상위 상품 중 가장 비싼 편이에요", `내 가격 ${won(price)} · 중앙값 ${won(med)} · 상위 75% 가격 ${won(p75)}`, "가격 차이를 납득시킬 근거(원산지·등급·수제·용량)가 없다면 구성 변경이나 묶음 상품으로 체감 가격을 낮추세요."));
  }
  return { key: "price", label: "가격 경쟁력", max, score, findings, stats: { min: prices[0], p25, med, p75, max: prices[prices.length - 1], below, prices } };
}

// ---------- 4. 마진 ----------
export function calcMargin({ price, shipFee = 0, cost = 0, courier = 0, feeRate = 6, adPerOrder = 0 }) {
  const revenue = Number(price) + Number(shipFee || 0);
  const fee = (revenue * Number(feeRate || 0)) / 100;
  const profit = revenue - Number(cost || 0) - Number(courier || 0) - fee - Number(adPerOrder || 0);
  return { revenue, fee, profit, rate: price ? profit / Number(price) : 0, profitNoAd: profit + Number(adPerOrder || 0) };
}

export function analyzeMargin(input) {
  const max = 15;
  if (!input.price || !input.cost) return null;
  const m = calcMargin(input);
  const findings = [];
  let score;
  const breakdown = `판매가 ${won(input.price)}${input.shipFee ? ` + 배송비 ${won(input.shipFee)}` : ""} − 원가 ${won(input.cost)} − 택배·포장 ${won(input.courier || 0)} − 수수료 ${won(m.fee)}${input.adPerOrder ? ` − 주문당 광고비 ${won(input.adPerOrder)}` : ""} = ${won(m.profit)}`;
  if (m.profit <= 0) {
    score = 0;
    findings.push(F("bad", "팔수록 손해예요", breakdown, "가격 인상, 원가·택배비 협상, 묶음 판매(객단가 올리기) 중 하나는 반드시 필요해요. 광고를 늘리기 전에 먼저 고쳐야 해요."));
  } else if (m.rate < 0.1) {
    score = 5;
    findings.push(F("bad", `순마진 ${pct(m.rate)} — 광고를 쓸 여유가 거의 없어요`, breakdown, "2개 묶음·대용량 구성으로 주문당 이익을 키우세요. 택배비는 객단가가 올라가도 그대로라 효과가 커요."));
  } else if (m.rate < 0.2) {
    score = 10;
    findings.push(F("warn", `순마진 ${pct(m.rate)}`, breakdown, `주문당 광고비는 ${won(m.profitNoAd * 0.5)} 이하로 관리하세요 (이익의 절반 기준).`));
  } else {
    score = 15;
    findings.push(F("good", `순마진 ${pct(m.rate)} — 광고를 공격적으로 써도 되는 구조예요`, breakdown, `손익분기 광고비: 주문당 ${won(m.profitNoAd)}까지.`));
  }
  return { key: "margin", label: "마진 구조", max, score, findings, margin: m };
}

// ---------- 5. 신뢰 (리뷰·평점) ----------
export function analyzeTrust(reviews, rating) {
  const max = 10;
  if (reviews === "" || reviews == null) return null;
  const n = Number(reviews);
  const r = Number(rating) || 0;
  const findings = [];
  let score = n >= 100 ? 10 : n >= 30 ? 7 : n >= 5 ? 4 : 1;
  if (n < 30) {
    findings.push(F(n < 5 ? "bad" : "warn", `리뷰 ${n}개 — 처음 보는 고객이 믿기엔 부족해요`, "리뷰 수는 클릭과 구매 결정에 가장 크게 작용하는 요소 중 하나예요.", "포토리뷰 적립금을 올리고, 구매 확정 3일 뒤 톡톡으로 리뷰 요청 메시지를 보내세요. 첫 30개가 가장 중요해요."));
  } else {
    findings.push(F("good", `리뷰 ${n.toLocaleString()}개`, "", ""));
  }
  if (r && r < 4.5) {
    score -= 2;
    findings.push(F("bad", `평점 ${r} — 낮은 편이에요`, "4.5 미만이면 비교하는 고객이 이탈해요.", "최근 낮은 평점 리뷰의 공통 불만(배송·포장·맛)을 찾아 그 부분부터 고치고, 모든 부정 리뷰에 해결 답글을 다세요."));
  }
  return { key: "trust", label: "신뢰 (리뷰·평점)", max, score: Math.max(0, score), findings };
}

// ---------- 6. 법규·필수 표기 (상세페이지 문구) ----------
const RISKY = [
  [/치료|완치|예방|처방/, "질병 치료·예방 표현"],
  [/항암|암\s?예방|당뇨|혈압|혈당|콜레스테롤|관절염/, "질병명 언급"],
  [/면역력\s?(강화|증진|향상)|면역\s?증강/, "면역 기능 표방"],
  [/다이어트\s?(효과|보조)|체지방\s?감소|살\s?빠/, "다이어트 효능"],
  [/디톡스|해독|독소\s?배출/, "해독·디톡스 표현"],
  [/최고|최상|1위|넘버원|No\.?\s?1|100%/i, "근거 없는 최상급·절대 표현"],
  [/무첨가|무방부제|무색소/, "'무첨가' 류 표현 (조건 충족 필요)"],
];
const FOOD_REQUIRED = [
  [/원산지|국내산|수입산|산\)/, "원산지"],
  [/보관|냉동|냉장|실온/, "보관 방법"],
  [/소비기한|유통기한|제조일/, "소비기한"],
  [/알레르기|알러지|함유/, "알레르기 유발 성분"],
];

export function analyzeCompliance(text, isFood) {
  const max = 5;
  const tx = String(text || "");
  if (tx.trim().length < 20) return null;
  const findings = [];
  let score = max;
  for (const [re, label] of RISKY) {
    const m = tx.match(re);
    if (m) {
      score -= 1;
      findings.push(F(label.includes("최상급") || label.includes("무첨가") ? "warn" : "bad", `검토 필요: ${label}`, `상세페이지에 '${m[0]}' 표현이 있어요.`, "표시광고법·식품표시광고법 위반 시 과태료나 판매 중지가 될 수 있어요. 근거 자료가 없다면 빼거나 사실 표현으로 바꾸세요."));
    }
  }
  if (isFood) {
    const miss = FOOD_REQUIRED.filter(([re]) => !re.test(tx)).map(([, l]) => l);
    if (miss.length) {
      score -= Math.min(2, miss.length);
      findings.push(F("warn", `상세페이지에서 못 찾은 표기: ${miss.join(", ")}`, "상품정보제공고시에 있더라도, 상세페이지에서 바로 보여야 고객 문의·반품이 줄어요.", "상세페이지 하단에 표 형태로 정리해 넣으세요."));
    }
  }
  if (!findings.length) findings.push(F("good", "위험 표현을 찾지 못했어요", "자동 검사라 100% 보장은 아니에요.", ""));
  return { key: "law", label: "법규 · 필수 표기", max, score: Math.max(0, score), findings };
}

// ---------- 7. 광고 효율 (검색광고 리포트 CSV) ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === "\t") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const num = (s) => Number(String(s ?? "").replace(/[^\d.-]/g, "")) || 0;

export function parseAdReport(text) {
  const rows = parseCsv(String(text || "").replace(/^﻿/, ""));
  // 네이버 보고서는 위에 제목줄이 있을 수 있어 헤더 행을 찾는다
  const hi = rows.findIndex((r) => r.some((c) => /키워드|검색어/.test(c)) && r.some((c) => /비용/.test(c)));
  if (hi < 0) throw new Error("CSV에서 '키워드'와 '총비용' 열을 찾지 못했어요. 검색광고 보고서(키워드별)를 CSV로 받아 올려주세요.");
  const h = rows[hi].map((c) => c.trim());
  const col = (re) => h.findIndex((c) => re.test(c));
  const ci = {
    kw: col(/키워드|검색어/),
    imp: col(/노출/),
    clk: col(/클릭수|^클릭$/),
    cost: col(/총비용|비용/),
    conv: col(/전환수|구매완료/),
    sales: col(/전환매출|구매완료\s?매출|매출액/),
  };
  const map = {};
  for (const r of rows.slice(hi + 1)) {
    const kw = (r[ci.kw] || "").trim();
    if (!kw || /합계|총계|^-$/.test(kw)) continue;
    const o = (map[kw] ||= { keyword: kw, imp: 0, clk: 0, cost: 0, conv: 0, sales: 0 });
    o.imp += num(r[ci.imp]);
    o.clk += num(r[ci.clk]);
    o.cost += num(r[ci.cost]);
    o.conv += ci.conv >= 0 ? num(r[ci.conv]) : 0;
    o.sales += ci.sales >= 0 ? num(r[ci.sales]) : 0;
  }
  return { rows: Object.values(map), hasConv: ci.conv >= 0 };
}

export function analyzeAds(ad, margin) {
  const max = 10;
  if (!ad?.rows?.length) return null;
  const total = ad.rows.reduce((a, r) => ({ cost: a.cost + r.cost, conv: a.conv + r.conv, sales: a.sales + r.sales, clk: a.clk + r.clk }), { cost: 0, conv: 0, sales: 0, clk: 0 });
  const waste = ad.rows.filter((r) => r.cost > 0 && r.conv === 0).sort((a, b) => b.cost - a.cost);
  const wasteCost = waste.reduce((a, r) => a + r.cost, 0);
  const ratio = total.cost ? wasteCost / total.cost : 0;
  const roas = total.cost ? total.sales / total.cost : 0;
  const findings = [];
  let score = !ad.hasConv ? 5 : ratio <= 0.1 ? 10 : ratio <= 0.25 ? 6 : 2;
  if (!ad.hasConv) {
    findings.push(F("warn", "전환(구매) 데이터가 없는 보고서예요", "전환 추적이 안 되면 어떤 키워드가 돈을 벌어오는지 알 수 없어요.", "검색광고 → 도구 → 프리미엄 로그분석(전환추적)을 스마트스토어와 연동하세요."));
  } else if (waste.length) {
    findings.push(
      F(
        ratio > 0.25 ? "bad" : "warn",
        `판매 0건인 키워드에 ${won(wasteCost)} 지출 (광고비의 ${pct(ratio)})`,
        `상위 낭비 키워드: ${waste.slice(0, 5).map((r) => `${r.keyword} ${won(r.cost)}`).join(", ")}`,
        "클릭 20회 이상인데 구매 0건인 키워드는 입찰가를 낮추거나 끄세요. 아낀 돈을 구매가 나는 키워드에 옮기세요."
      )
    );
  }
  if (ad.hasConv && total.cost) {
    // 손익분기 ROAS = 매출 ÷ 광고비 전 이익 (광고비가 이익을 다 먹는 지점)
    const be = margin?.profitNoAd > 0 ? margin.revenue / margin.profitNoAd : null;
    const lvl = be ? (roas >= be ? "good" : "bad") : roas >= 4 ? "good" : "warn";
    findings.push(
      F(
        lvl,
        `광고 수익률(ROAS) ${Math.round(roas * 100)}%`,
        `광고비 ${won(total.cost)} → 매출 ${won(total.sales)}${be ? ` · 내 마진 기준 손익분기 ROAS ${Math.round(be * 100)}%` : ""}`,
        lvl === "good" ? "" : "손익분기 ROAS보다 낮으면 광고할수록 손해예요. 낭비 키워드부터 정리하세요."
      )
    );
  }
  return { key: "ads", label: "광고 효율", max, score, findings, ads: { total, waste: waste.slice(0, 15), wasteCost, ratio, roas } };
}

// ---------- 시즌 ----------
export function analyzeSeason(trend, now = new Date()) {
  if (!trend?.length) return null;
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const t of trend) byMonth[Number(t.period.slice(5, 7)) - 1].push(t.ratio);
  const avg = byMonth.map((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0));
  const mean = avg.reduce((a, b) => a + b, 0) / 12 || 1;
  const peaks = avg.map((v, i) => ({ m: i + 1, v })).filter((x) => x.v >= mean * 1.25).sort((a, b) => b.v - a.v);
  const cur = now.getMonth() + 1;
  const upcoming = peaks.find((p) => ((p.m - cur + 12) % 12) >= 1 && ((p.m - cur + 12) % 12) <= 2);
  return { avg, mean, peaks: peaks.map((p) => p.m), upcoming: upcoming?.m || null, current: cur };
}

// ---------- 종합 ----------
export function totalScore(areas) {
  const list = areas.filter(Boolean);
  const max = list.reduce((a, x) => a + x.max, 0);
  const got = list.reduce((a, x) => a + x.score, 0);
  return max ? Math.round((got / max) * 100) : 0;
}

export function grade(score) {
  if (score >= 85) return { label: "우수", tone: "good" };
  if (score >= 70) return { label: "좋아요", tone: "good" };
  if (score >= 50) return { label: "보완하면 좋아요", tone: "warn" };
  return { label: "집중 개선 추천", tone: "bad" };
}

// ---------- 키워드 기회 (검색광고 API 검색량 기준) ----------
// 상품명에 없는데 검색량이 많은 연관 키워드 / 검색량 대비 경쟁 '낮음' 키워드
export function keywordOpportunities(title, list, mainKeyword) {
  if (!list?.length) return null;
  const compact = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const t = compact(title);
  const main = compact(mainKeyword);
  const missing = list.filter((k) => !t.includes(compact(k.keyword)) && compact(k.keyword) !== main).slice(0, 8);
  const golden = list
    .filter((k) => k.comp === "낮음" || k.comp === "중간")
    .sort((a, b) => (a.comp === b.comp ? b.volume - a.volume : a.comp === "낮음" ? -1 : 1))
    .slice(0, 8);
  const mainRow = list.find((k) => compact(k.keyword) === main);
  return { missing, golden, mainVolume: mainRow?.volume || null, mainComp: mainRow?.comp || "" };
}

export function keywordFindings(op) {
  if (!op) return [];
  const out = [];
  if (op.mainVolume != null) {
    out.push(F(op.mainComp === "높음" ? "warn" : "good", `대표 키워드 월 검색량 ${op.mainVolume.toLocaleString()}회 (경쟁 ${op.mainComp || "-"})`, op.mainComp === "높음" ? "경쟁이 높은 키워드라 신규·소규모 상품은 상위 노출이 어려워요." : "", op.mainComp === "높음" ? "경쟁이 '낮음·중간'인 세부 키워드로 먼저 판매를 쌓으세요." : ""));
  }
  if (op.missing.length) {
    out.push(
      F(
        "warn",
        `검색량 많은 연관 키워드 ${op.missing.length}개가 상품명에 없어요`,
        op.missing.slice(0, 6).map((k) => `${k.keyword}(${k.volume.toLocaleString()})`).join(", "),
        "상품에 맞는 단어만 골라 상품명·태그에 넣으세요. 상품과 무관한 키워드는 넣지 마세요."
      )
    );
  }
  return out;
}

// ---------- 구매 전환 요소 (배송·혜택·구성) ----------
export function analyzeOffer(p) {
  const max = 10;
  if (!p) return null;
  const findings = [];
  let score = max;
  const ship = Number(p.shipFee);
  const price = Number(p.salePrice || p.price) || 0;
  const benefits = (p.benefits || []).join(" ");
  const badges = (p.badges || []).join(" ");

  // 배송비
  if (Number.isFinite(ship) && ship >= 3000 && !p.freeShipOver) {
    score -= 2;
    findings.push(F("warn", `배송비 ${ship.toLocaleString()}원 · 무료배송 조건 없음`, "배송비는 장바구니에서 마지막에 망설이게 되는 가장 흔한 이유예요.", "'○○원 이상 무료배송' 조건을 걸거나, 배송비를 가격에 녹인 무료배송 옵션을 시험해 보세요."));
  } else if (ship === 0) {
    findings.push(F("good", "무료배송", "", ""));
  } else if (p.freeShipOver) {
    findings.push(F("good", `${Number(p.freeShipOver).toLocaleString()}원 이상 무료배송 조건 있음`, "", ""));
  }

  // 쿠폰·적립 혜택
  if (!p.benefits?.length) {
    score -= 2;
    findings.push(F("warn", "보이는 혜택(쿠폰·적립)이 없어요", "비슷한 상품끼리 비교할 때 마지막에 고르는 기준이 혜택이에요.", "첫 구매 쿠폰이나 알림받기 쿠폰을 설정하세요. 스마트스토어 혜택 관리에서 바로 할 수 있어요."));
  } else {
    findings.push(F("good", `혜택 표시: ${p.benefits.slice(0, 3).join(", ")}`, "", ""));
  }

  // 리뷰 이벤트
  if (!/리뷰|후기|포토/.test(benefits)) {
    score -= 1;
    findings.push(F("warn", "리뷰 적립 이벤트가 안 보여요", "리뷰가 쌓이는 속도가 곧 새 손님의 신뢰가 쌓이는 속도예요.", "포토리뷰 적립금(예: 500~1,000원)과 한 달 사용 리뷰 적립을 따로 설정하세요."));
  }

  // 빠른 출고 표시
  if (p.badges && !/오늘출발|도착보장|빠른|당일/.test(badges)) {
    score -= 1;
    findings.push(F("warn", "오늘출발·도착보장 표시가 없어요", "같은 조건이면 '오늘 출발' 표시가 있는 상품이 먼저 선택돼요.", "출고 마감 시간을 정해 스마트스토어 '오늘출발' 설정을 켜보세요. 냉동·신선 상품도 마감 시간만 맞추면 가능해요."));
  }

  // 가격 끝자리 (심리적 가격)
  if (price >= 10000) {
    const r = price % 10000;
    if (r <= 900) {
      const alt = price - r - 100;
      findings.push(F("warn", `가격 ${price.toLocaleString()}원 → ${alt.toLocaleString()}원 검토`, "만 원 단위를 막 넘긴 가격은 실제 차이보다 비싸게 느껴져요.", `${alt.toLocaleString()}원으로 맞추면 앞자리가 바뀌어 체감 가격이 내려가요. 마진이 허락할 때만요.`));
    }
  }

  // 구성(옵션) — 화면에서 옵션 목록을 실제로 확인했을 때만 판단
  if (Array.isArray(p.options)) {
    if (p.options.length === 1) {
      score -= 2;
      findings.push(F("warn", "구성(옵션)이 하나뿐이에요", "구성이 하나면 객단가를 올릴 방법이 없어요.", "2개·3개 묶음이나 함께 쓰기 좋은 구성 옵션을 추가해 보세요. 택배비가 같아서 마진이 좋아져요."));
    } else if (p.options.length > 1) {
      findings.push(F("good", `구성 ${p.options.length}가지 (${p.options.slice(0, 3).join(", ")}${p.options.length > 3 ? " 등" : ""})`, "", ""));
    }
  }

  if (p.salePrice && p.price && p.salePrice < p.price) {
    findings.push(F("good", `할인 표시 중 (${Math.round((1 - p.salePrice / p.price) * 100)}%)`, "", ""));
  }
  return { key: "offer", label: "구매 전환 요소", max, score: Math.max(0, score), findings };
}

export function reviewIssueFindings(issues, praise) {
  const out = [];
  if (issues?.length) out.push(F("bad", "리뷰에서 반복되는 불만", issues.join(" · "), "상세페이지 상단과 문의 답변에서 이 부분을 먼저 해결·설명하세요. 같은 불만이 계속 보이면 새 고객이 이탈해요."));
  if (praise?.length) out.push(F("good", "리뷰에서 반복되는 칭찬", praise.join(" · "), "이 문장들을 상세페이지 첫 화면과 대표 이미지 문구로 그대로 쓰세요."));
  return out;
}

// ---------- 옵션 가격 구조 ----------
// 옵션별 추가금(예: 커버만 -12,000원)으로 '실제로 살 수 있는 가장 싼 가격'을 구하고,
// 대표 가격을 가장 싼 구성으로 내리고 나머지를 + 옵션으로 바꾸는 구조를 제안
export function analyzeOptionPrice(price, optionPrices) {
  const list = (optionPrices || []).filter((o) => o && o.name);
  price = Number(price) || 0;
  if (!price || list.length < 2) return null;
  const live = list.filter((o) => !o.soldOut);
  const pool = live.length ? live : list;
  const deltas = pool.map((o) => Number(o.delta) || 0);
  const minD = Math.min(...deltas);
  const maxD = Math.max(...deltas);
  const cheapest = pool.filter((o) => (Number(o.delta) || 0) === minD);
  const priciest = pool.filter((o) => (Number(o.delta) || 0) === maxD);
  const minEff = price + minD;
  const maxEff = price + maxD;
  const soldOut = list.filter((o) => o.soldOut).map((o) => o.name);
  const findings = [];
  const names = (arr) => arr.slice(0, 3).map((o) => o.name).join(", ") + (arr.length > 3 ? ` 외 ${arr.length - 3}개` : "");

  if (minD < 0 && -minD >= price * 0.1) {
    const upRatio = minEff > 0 ? (maxEff - minEff) / minEff : 0;
    findings.push(
      F(
        "warn",
        `검색 결과엔 ${won(price)}으로 보이지만, 실제로는 ${won(minEff)}부터 살 수 있어요`,
        `가장 싼 구성: ${names(cheapest)} (${won(minD)}) → ${won(minEff)} · 가장 비싼 구성: ${won(maxEff)}. 손님은 검색 목록에서 ${won(price)}만 보고 '비싸다'고 지나칠 수 있어요.`,
        `대표 가격을 ${won(minEff)}(${names(cheapest)})으로 바꾸고, 나머지 구성은 '+ 추가금' 옵션으로 바꿔 보세요. 그러면 검색 목록·가격비교에 ${won(minEff)}으로 보여 클릭이 늘어요. 단, 스마트스토어는 옵션 추가금이 대표 가격의 일정 비율을 넘으면 등록이 안 돼요${upRatio > 0.5 ? ` — 바꾸면 추가금이 최대 +${Math.round(upRatio * 100)}%가 되니, 등록이 안 되면 비싼 구성은 별도 상품으로 나누세요` : ""}.`
      )
    );
  } else if (maxD > 0) {
    findings.push(F("good", "대표 가격이 가장 싼 구성 기준이에요", `옵션은 ${won(price)}부터 최대 ${won(maxEff)}까지 (+${won(maxD)})`, ""));
  }
  if (soldOut.length) {
    findings.push(F("warn", `품절 옵션 ${soldOut.length}개가 목록에 남아 있어요`, soldOut.slice(0, 4).join(", "), "품절 옵션은 재입고 전까지 숨기거나 맨 아래로 내려 주세요. 손님이 고르려다 막히면 이탈이 늘어요."));
  }
  return { findings, stats: { minEff, maxEff, minD, maxD, count: list.length, soldOut: soldOut.length, cheapest: cheapest[0]?.name || "" } };
}

// ---------- 카테고리 ----------
// 검색 상위 상품들이 어느 카테고리에 있는지 세어서, 내 상품 카테고리가 맞는지 비교
// 네이버는 검색어마다 '잘 맞는 카테고리'가 있어 그 카테고리 상품을 위로 올리는 경향이 있음
const catSplit = (c) => String(c || "").split(/\s*[>›＞]\s*/).map((x) => x.trim()).filter(Boolean);
export function analyzeCategory(myCategory, market) {
  const items = (market?.top || []).slice(0, 40).filter((x) => x.category);
  if (items.length < 5) return null;
  const counts = {};
  for (const x of items) {
    const k = catSplit(x.category).join(" > ");
    if (k) counts[k] = (counts[k] || 0) + 1;
  }
  const top = Object.entries(counts)
    .map(([path, n]) => ({ path, n, share: Math.round((n / items.length) * 100) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const top10 = (market?.top || []).slice(0, 10).filter((x) => x.category);
  const best = top[0];
  const my = catSplit(myCategory);
  const myPath = my.join(" > ");
  const bestParts = catSplit(best.path);
  // 내 카테고리와 1위 카테고리가 몇 단계까지 같은지
  let same = 0;
  while (same < Math.min(my.length, bestParts.length) && my[same] === bestParts[same]) same++;
  // 검색 화면에는 카테고리가 2단계까지만 보이기도 해서, 한쪽이 다른 쪽의 앞부분이면 같은 카테고리로 봄
  const related = (path) => {
    const p = catSplit(path);
    const n = Math.min(p.length, my.length);
    return n >= 2 && p.slice(0, n).join(">") === my.slice(0, n).join(">");
  };
  const myShare = my.length ? items.filter((x) => related(x.category)).length : 0;
  const match = !my.length ? "unknown" : related(best.path) || myShare / items.length >= 0.3 ? "same" : same >= 2 ? "parent" : "diff";
  const findings = [];
  const max = 10;
  let score = max;
  const list = top.slice(0, 3).map((t) => `${t.path} (${t.n}개)`).join(" · ");
  if (match === "same") {
    findings.push(F("good", "카테고리가 검색 상위 상품들과 같아요", `내 카테고리: ${myPath}\n상위 ${items.length}개 중 ${myShare || best.n}개가 같은 카테고리예요.`, ""));
  } else if (match === "parent") {
    score = 6;
    findings.push(F("warn", "큰 분류는 맞지만 세부 카테고리가 달라요", `내 카테고리: ${myPath}\n검색 상위는 대부분 '${best.path}' (${best.share}%)`, `상품 수정 → 카테고리를 '${best.path}'로 바꾸는 걸 검토해 보세요. 네이버는 검색어와 잘 맞는 카테고리의 상품을 먼저 보여줘요. 바꾸기 전에 그 카테고리의 필수 정보(상품정보제공고시·인증)를 확인하세요.`));
  } else if (match === "diff") {
    score = 2;
    findings.push(F("bad", "카테고리가 검색 상위 상품들과 완전히 달라요", `내 카테고리: ${myPath}\n검색 상위: ${list}`, `'${best.path}'로 옮기는 걸 우선 검토하세요. 카테고리가 다르면 상품명이 좋아도 이 검색어에서 잘 안 보여요.`));
  } else {
    score = 7;
    findings.push(F("warn", "내 상품 카테고리를 읽지 못했어요", `검색 상위는 대부분 '${best.path}' (${best.share}%)`, "스마트스토어 상품 수정 화면에서 카테고리가 이것과 같은지 확인해 보세요."));
  }
  return {
    key: "category",
    label: "카테고리",
    max,
    score,
    findings,
    cat: { my: myPath, match, top: top.map((t) => ({ ...t, mine: my.length ? related(t.path) : false })), scanned: items.length, top10: top10.map((x) => catSplit(x.category).join(" > ")) },
  };
}
