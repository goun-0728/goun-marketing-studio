// '고운 진단' 북마크 버튼 코드 생성.
// 사용자가 자기 브라우저에서 보고 있는 화면(스마트스토어 상품 페이지 / 네이버쇼핑 검색 결과)의
// 보이는 정보만 모아서 압축 → 스튜디오 새 탭으로 넘긴다. 서버가 네이버에 접속하지 않음.

// 문자열로 보관: 빌드 시 압축(minify)돼도 버튼 코드가 그대로 유지되도록
const COLLECTOR = String.raw`
  /* eslint-disable */
  // 스튜디오 주소는 생성 시 실제 주소로 바뀜
  var S = "__STUDIO__";
  var w = window.open("about:blank", "goun_studio");
  (async function () {
    try {
      var path = location.pathname;
      var host = location.hostname;
      var isProduct = /\/products\/\d+/.test(path);
      var kind = isProduct ? "product" : /smartstore\.naver|brand\.naver/.test(host) ? "store" : /search|shopping|naver\.com/.test(host + path) ? "search" : "page";

      var meta = {};
      document.querySelectorAll("meta[property],meta[name]").forEach(function (m) {
        var k = m.getAttribute("property") || m.getAttribute("name");
        if (/^(og:|product:|description|keywords)/.test(k || "")) meta[k] = (m.content || "").slice(0, 500);
      });

      // 페이지에 들어 있는 상품 데이터(JSON)에서 필요한 값만 골라내기 — 구조가 바뀌어도 키 이름으로 찾음
      var want = ["name", "dispName", "productName", "salePrice", "discountedSalePrice", "mobileDiscountedSalePrice", "totalReviewCount", "averageReviewScore", "reviewCount", "reviewAmount", "ratingValue", "ratingCount", "reviewScore", "averageScore", "totalCount", "wholeCategoryName", "categoryName", "wholeCategoryId", "categoryId", "baseFee", "deliveryFee", "freeConditionalAmount", "channelName", "storeName", "mallName", "productNo", "channelProductNo", "keepCnt", "purchaseCount", "stockQuantity"];
      var pick = {};
      // 옵션별 가격(예: 커버만 -12,000원)·추가상품 — 옵션 목록이 닫혀 있어도 페이지 데이터에 들어 있음
      var opts = [];
      // 검색 결과: 페이지 데이터 안의 상품 목록(순서 그대로) — AI가 화면 글자를 추측하지 않아도 됨
      var sitems = [];
      var sseen = {};
      var sups = [];
      var seen = new Set();
      var steps = 0;
      function walk(o, d) {
        if (!o || typeof o !== "object" || d > 9 || seen.has(o) || steps > 60000) return;
        seen.add(o);
        if (kind === "search" && sitems.length < 80 && typeof o.productTitle === "string" && (o.price || o.lowPrice)) {
          var sk = o.id || o.nvMid || o.productTitle;
          if (!sseen[sk]) {
            sseen[sk] = 1;
            sitems.push({ t: o.productTitle.replace(/<[^>]+>/g, "").slice(0, 100), p: Number(o.lowPrice || o.price) || 0, m: Number(o.productType) === 1 || Number(o.mallCount) > 1 ? "가격비교" : String(o.mallName || o.mallNameOrg || "").slice(0, 40), ad: o.adId || o.isAd ? 1 : 0, cat: Number(o.productType) === 1 || Number(o.mallCount) > 1 ? 1 : 0, rv: o.reviewCount != null ? Number(o.reviewCount) : null, cp: [o.category1Name, o.category2Name, o.category3Name, o.category4Name].filter(Boolean).join(">").slice(0, 80), h: String(o.mallProductUrl || o.crUrl || o.productUrl || "").slice(0, 300) });
          }
        }
        for (var k in o) {
          steps++;
          var v;
          try { v = o[k]; } catch (e) { continue; }
          if (k === "optionCombinations" && Array.isArray(v) && !opts.length) {
            v.slice(0, 80).forEach(function (c) {
              if (c && typeof c === "object") opts.push({ n: [c.optionName1, c.optionName2, c.optionName3].filter(Boolean).join(" / ").slice(0, 60), p: Number(c.price) || 0, s: c.stockQuantity == null ? null : Number(c.stockQuantity), u: c.usable !== false });
            });
          }
          if (k === "supplementProducts" && Array.isArray(v) && !sups.length) {
            v.slice(0, 30).forEach(function (c) {
              if (c && typeof c === "object") sups.push({ n: String(c.name || c.groupName || "").slice(0, 60), p: Number(c.price) || 0 });
            });
          }
          if (want.indexOf(k) >= 0 && (typeof v === "string" || typeof v === "number") && !(k in pick)) pick[k] = typeof v === "string" ? v.slice(0, 300) : v;
          if (v && typeof v === "object") walk(v, d + 1);
        }
      }
      try { if (window.__PRELOADED_STATE__) walk(window.__PRELOADED_STATE__, 0); } catch (e) {}
      try { var nd = document.getElementById("__NEXT_DATA__"); if (nd) walk(JSON.parse(nd.textContent), 0); } catch (e) {}
      try {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) { walk(JSON.parse(s.textContent), 0); });
      } catch (e) {}

      var text = (document.body.innerText || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").slice(0, 30000);

      // 리뷰 수·평점 단서: 숫자만 따로 떨어져 있거나 화면에 안 보이는 라벨에 있는 경우가 많아 따로 모음
      var hints = [];
      function addHint(x) {
        x = String(x || "").replace(/\s+/g, " ").trim();
        if (x && x.length <= 80 && /\d/.test(x) && hints.indexOf(x) < 0 && hints.length < 80) hints.push(x);
      }
      var full = document.body.innerText || "";
      var re = /(리뷰|후기|평점|별점|구매평|만족도|구매자)[^\n]{0,40}/g, m;
      while ((m = re.exec(full)) && hints.length < 40) addHint(m[0]);
      // 줄이 나뉜 경우: '리뷰' 다음 줄의 숫자, '★' 뒤 숫자
      var lines = full.split("\n");
      for (var li = 0; li < lines.length && hints.length < 60; li++) {
        if (/^(리뷰|평점|별점|구매평)/.test(lines[li].trim()) && lines[li + 1]) addHint(lines[li].trim() + " " + lines[li + 1].trim());
        if (/[★☆]/.test(lines[li])) addHint(lines[li] + " " + (lines[li + 1] || ""));
      }
      document.querySelectorAll("[aria-label],[class*=review],[class*=Review],[class*=rating],[class*=Rating],[class*=star],[class*=Star],[class*=grade],[class*=Grade],[class*=score],[class*=Score]").forEach(function (el) {
        if (hints.length >= 80) return;
        addHint(((el.getAttribute("aria-label") || "") + " " + (el.textContent || "")).slice(0, 120));
      });

      // 리뷰 글: 본문이 길면 화면 글자 앞부분에서 잘려서 따로 모음 (날짜 'YY.MM.DD.'가 있는 칸 = 리뷰 1개)
      var revs = [];
      if (isProduct) {
        var rEls = [];
        document.querySelectorAll("li, [class*=review] > div, [class*=Review] > div").forEach(function (el) {
          var tx = (el.innerText || "").trim();
          if (tx.length < 15 || tx.length > 1200 || !/\d{2}\.\d{1,2}\.\d{1,2}\./.test(tx)) return;
          if (!/평점|★|별점|구매|옵션|재구매|사용|맛|배송|만족|좋|별로|아쉽/.test(tx)) return;
          rEls.push(el);
        });
        // 다른 리뷰 칸을 품은 큰 묶음은 제외
        rEls = rEls.filter(function (el) { return !rEls.some(function (o) { return o !== el && el.contains(o); }); });
        rEls.slice(0, 40).forEach(function (el) {
          var tx = (el.innerText || "").replace(/\s+/g, " ").trim();
          var st = tx.match(/평점\s*(\d)/) || tx.match(/★\s*(\d)/) || tx.match(/별점\s*(\d)/);
          var lab = el.querySelector("[aria-label*='평점'],[aria-label*='별점'],[aria-label*='5점']");
          var st2 = lab ? (lab.getAttribute("aria-label").match(/(\d)/) || [])[1] : null;
          revs.push({ s: st ? Number(st[1]) : st2 ? Number(st2) : null, x: tx.slice(0, 260) });
        });
      }

      var links = [];
      document.querySelectorAll("a[href]").forEach(function (a) {
        if (links.length >= 150) return;
        var h = a.href;
        if (/\/products\/\d|\/catalog\/\d|nvMid=|smartstore\.naver|brand\.naver|adcr\.naver/.test(h)) links.push({ t: (a.innerText || "").trim().replace(/\s+/g, " ").slice(0, 90), h: h.slice(0, 300) });
      });

      // 검색 결과: 화면의 상품 칸(카드)을 위에서부터 하나씩 — 상품명 링크에서 가격이 있는 칸까지 올라가 묶음
      var cards = [];
      if (kind === "search") {
        var cEls = [];
        document.querySelectorAll("a[href]").forEach(function (a) {
          var t = (a.innerText || "").trim().replace(/\s+/g, " ");
          if (t.length < 10 || t.length > 160 || /^\d|원$/.test(t)) return;
          var el = a, card = null;
          for (var up = 0; up < 9 && el.parentElement; up++) {
            el = el.parentElement;
            var tx = el.innerText || "";
            if (tx.length > 1600) break;
            if (/[\d,]{3,}\s*원/.test(tx) && el.getBoundingClientRect().height > 70) { card = el; break; }
          }
          if (!card) return;
          // 판매처 이름·리뷰 칸까지 담기: 다른 상품명이 섞이지 않는 데까지 한두 칸 더 올라감
          var longA = function (box) {
            var n = {};
            box.querySelectorAll("a[href]").forEach(function (x) { var xt = (x.innerText || "").trim(); if (xt.length >= 10 && xt.length <= 160 && !/^\d|원$/.test(xt)) n[xt] = 1; });
            return Object.keys(n).length;
          };
          for (var up2 = 0; up2 < 4 && card.parentElement; up2++) {
            var par = card.parentElement;
            if ((par.innerText || "").length > 1400 || longA(par) > 1) break;
            card = par;
          }
          if (cEls.indexOf(card) >= 0) return;
          cEls.push(card);
          cards.push({ el: card, t: t.slice(0, 120), h: a.href.slice(0, 300) });
        });
        // 다른 카드를 품고 있는 큰 묶음은 빼고, 화면 위→아래 순서로
        cards = cards.filter(function (c) { return !cards.some(function (o) { return o !== c && c.el.contains(o.el); }); });
        cards.sort(function (a, b) { return a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top || a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left; });
        cards = cards.slice(0, 60).map(function (c) { return { t: c.t, x: (c.el.innerText || "").replace(/\s+/g, " ").slice(0, 320), h: c.h }; });
      }

      var imgs = [];
      document.querySelectorAll("img").forEach(function (i) {
        var cands = [i.currentSrc, i.src, i.getAttribute("data-src"), i.getAttribute("data-original"), i.getAttribute("data-lazy-src")];
        var u = "";
        for (var c = 0; c < cands.length; c++) { if (cands[c] && /^https:\/\//.test(cands[c])) { u = cands[c]; break; } }
        if (!u || imgs.indexOf(u) >= 0) return;
        var w0 = Math.max(i.naturalWidth || 0, i.width || 0);
        var lazy = !/^https:/.test(i.getAttribute("src") || "") && !!(i.getAttribute("data-src") || i.getAttribute("data-original") || i.getAttribute("data-lazy-src"));
        var thumb = /type=(f|m|w)\d{2,3}(_|$|&)/.test(u);
        var detail = /pstatic\.net/.test(u) && !thumb && (lazy || w0 >= 300);
        if ((w0 >= 500 || detail) && imgs.length < 14) imgs.push(u);
      });

      var data = { v: 2, kind: kind, url: location.href, title: document.title, meta: meta, pick: pick, opts: opts, sups: sups, sitems: sitems, cards: cards, revs: revs, hints: hints, text: text, links: links, imgs: imgs, at: Date.now() };
      var bytes = new TextEncoder().encode(JSON.stringify(data));
      var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      var buf = new Uint8Array(await new Response(stream).arrayBuffer());
      var bin = "";
      for (var i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      var b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      var u = S + "/?import=1#gz=" + b64;
      if (w && !w.closed) w.location.href = u;
      else location.href = u;
    } catch (e) {
      alert("고운 진단: 화면을 읽지 못했어요 (" + e.message + "). 최신 크롬에서 다시 시도해 주세요.");
      if (w && !w.closed) w.close();
    }
  })();
  /* eslint-enable */
`;

export function buildBookmarklet(origin) {
  const code = COLLECTOR.split("__STUDIO__").join(origin)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\n\s*/g, " ")
    .trim();
  // 주소창 실행 시 %·# 등이 깨지지 않게 인코딩
  return "javascript:" + encodeURIComponent(`(function(){${code}})();void 0`);
}

export function bookmarkletSource(origin) {
  return COLLECTOR.split("__STUDIO__").join(origin);
}
