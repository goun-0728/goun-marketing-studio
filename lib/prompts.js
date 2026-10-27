// 작업(task)별 프롬프트 빌더. 서버(/api/ai)에서만 사용.

const SYSTEM_BASE = `당신은 한국 소상공인·온라인 셀러 전문 퍼포먼스 마케터이자 카피라이터입니다.
- 네이버(스마트스토어, 블로그, 플레이스, 검색광고), 인스타그램, 당근, 카카오톡 채널 생태계를 잘 압니다.
- 결론부터, 실무에 바로 쓸 수 있게 씁니다. 뻔한 일반론은 쓰지 않습니다.
- 허위·과장 광고, 근거 없는 최상급 표현("최고","1위","100%")은 쓰지 않습니다.
- 식품은 질병 예방·치료 효능 표현을 쓰지 않습니다(식품표시광고법). 건강기능식품이 아니면 기능성도 표방하지 않습니다.
- 모르는 정보(가격, 수상 이력, 수치 등)는 지어내지 말고 [대괄호]로 비워 둡니다.`;

const JSON_RULE = `반드시 JSON만 출력하세요. 코드블록(\`\`\`)이나 설명 문장 없이 순수 JSON 객체 하나만.`;

function storeBlock(s = {}) {
  const rows = [
    ["상호/브랜드", s.name],
    ["업종", s.category],
    ["판매 채널", s.channel],
    ["지역/상권", s.location],
    ["대표 상품·메뉴", s.products],
    ["타겟 고객", s.target],
    ["강점·차별점", s.strengths],
    ["가격대", s.price],
    ["진행 중 이벤트/혜택", s.event],
    ["원하는 말투", s.tone],
    ["검색 키워드/링크", s.link],
  ].filter(([, v]) => v && String(v).trim());
  if (!rows.length) return "(가게 정보 없음)";
  return rows.map(([k, v]) => `- ${k}: ${String(v).trim()}`).join("\n");
}

const CHANNEL_GUIDE = {
  "인스타그램 피드": "첫 줄 3초 훅, 짧은 줄바꿈, 이모지는 절제, 마지막에 행동 유도. 해시태그 15~20개(대형·중형·지역/니치 혼합).",
  "인스타 릴스/숏폼 대본": "0~3초 훅 → 문제/궁금증 → 보여주기 → 행동 유도. 장면별 [화면] / 자막 / 내레이션 구분, 30초 이내.",
  "네이버 블로그": "제목에 핵심 검색 키워드 앞쪽 배치(30자 내외). 본문 1,500자 내외, 소제목 3~4개, 사진 들어갈 자리 [사진: 설명] 표시, 체험/정보형 톤. 해시태그 10개.",
  "네이버 플레이스 소식": "300자 내외, 지금 방문해야 할 이유(신메뉴·이벤트·시즌) 중심, 마지막에 예약/방문 유도.",
  "당근 비즈프로필 소식": "동네 이웃에게 말하듯 친근하게, 300자 내외, 위치 랜드마크 언급, 단골 혜택.",
  "스마트스토어 공지/상품 소개": "구매 전환 중심. 핵심 혜택 3개 bullet, 배송/보관/구성 안내, 리뷰 이벤트 유도.",
  "카카오톡 채널 메시지": "반드시 첫 줄을 '(광고)'로 시작하고 마지막에 '수신거부: 채널 차단' 안내 포함(정보통신망법). 400자 이내, 버튼 문구 제안 1개.",
  "네이버 검색광고(파워링크)": "제목 15자 이내, 설명 45자 이내를 엄격히 지키는 소재 3세트. body에 '제목 | 설명' 형식으로 줄바꿈 구분. 글자수 반드시 지킬 것.",
  "현수막/POP 문구": "가게 앞 현수막·매장 POP용. 메인 카피 12자 이내 + 서브 카피 20자 이내, 3안.",
};

export const CHANNELS = Object.keys(CHANNEL_GUIDE);

function copyPrompt(store, o) {
  const channels = (o.channels?.length ? o.channels : ["인스타그램 피드"]).filter((c) => CHANNEL_GUIDE[c]);
  const variants = Math.min(Math.max(Number(o.variants) || 1, 1), 3);
  return {
    json: true,
    maxTokens: 8000,
    system: SYSTEM_BASE,
    user: `[가게 정보]
${storeBlock(store)}

[이번 홍보 목적] ${o.goal || "인지도 및 방문/구매 유도"}
${o.extra ? `[추가 요청] ${o.extra}` : ""}

아래 채널별로 각각 ${variants}안씩 작성하세요.
${channels.map((c) => `- ${c}: ${CHANNEL_GUIDE[c]}`).join("\n")}

${JSON_RULE}
형식:
{"items":[{"channel":"채널명(위 목록 그대로)","variant":1,"title":"제목(없으면 빈 문자열)","body":"본문","hashtags":["#태그"]}]}`,
  };
}

function strategyPrompt(store, o) {
  return {
    json: false,
    maxTokens: 8000,
    system: SYSTEM_BASE,
    user: `[가게 정보]
${storeBlock(store)}

[월 마케팅 예산] ${o.budget || "미정 (0원~소액 기준으로 제안)"}
[현재 상황/고민] ${o.situation || "없음"}
[목표] ${o.goal || "매출 증대"}

이 가게를 위한 마케팅 실행 리포트를 마크다운으로 작성하세요. 결론 먼저, 실행 중심.
구성:
## 한 줄 진단
## 핵심 전략 3가지 (각각 왜 + 무엇을)
## 타겟 & 포지셔닝 (메인 타겟 페르소나 1명, 차별화 한 문장)
## 채널 우선순위 (표: 채널 | 우선순위 | 목적 | 주간 운영량 | 예상 비용)
## 4주 실행 캘린더 (표: 주차 | 해야 할 일 | 결과물)
## 바로 쓸 콘텐츠 아이디어 10개 (채널 표시)
## 예산 배분안
## 측정할 KPI (지표 | 목표치 | 확인 위치)
## 이번 주 체크리스트 (- [ ] 형식, 5~8개)
수치는 근거가 약하면 '예상'이라고 표시하고, 업종 특성상 하지 말아야 할 것도 짧게 덧붙이세요.`,
  };
}

function cardnewsPrompt(store, o) {
  const n = Math.min(Math.max(Number(o.slides) || 6, 4), 10);
  return {
    json: true,
    maxTokens: 4000,
    system: SYSTEM_BASE,
    user: `[가게 정보]
${storeBlock(store)}

[카드뉴스 주제] ${o.topic || "가게/상품 소개"}

인스타그램 카드뉴스 ${n}장 원고를 작성하세요.
- 1장: cover(스크롤을 멈추게 하는 훅), 마지막 장: cta(저장/방문/구매 유도), 나머지: content
- headline 16자 이내, sub 24자 이내, body 70자 이내(줄바꿈은 \\n 사용 가능)
- 한 장에 메시지 하나. 문장은 짧게.

${JSON_RULE}
형식:
{"slides":[{"type":"cover|content|cta","headline":"","sub":"","body":""}],"caption":"게시물 본문 캡션","hashtags":["#태그"]}`,
  };
}

function shortsPrompt(store, o) {
  const dur = Number(o.duration) || 20;
  const lines = Math.max(3, Math.round(dur / 2.6));
  return {
    json: true,
    maxTokens: 2000,
    system: SYSTEM_BASE,
    user: `[가게 정보]
${storeBlock(store)}

[영상 내용 설명] ${o.description || "가게/상품 소개 영상"}
[영상 길이] 약 ${dur}초

이 영상에 얹을 숏폼(릴스/쇼츠) 자막을 작성하세요.
- title: 영상 상단에 고정될 제목, 14자 이내, 궁금증 유발
- lines: 화면 하단 자막 ${lines}개, 각 14자 이내, 순서대로 이야기가 이어지게 (첫 줄은 강한 훅)
- cta: 마지막 2초 행동 유도 문구 16자 이내 (예: 검색어, 위치, 혜택)

${JSON_RULE}
형식:
{"title":"","lines":[""],"cta":""}`,
  };
}

function reportPrompt(store, o) {
  const kpis = (o.kpis || [])
    .filter((k) => k.cur !== "" && k.cur != null)
    .map((k) => `- ${k.label}: 이번 달 ${k.cur}${k.unit || ""}${k.prev ? ` / 지난달 ${k.prev}${k.unit || ""}` : ""}`)
    .join("\n");
  const ranks = (o.ranks || [])
    .map((r) => `- '${r.keyword}': 월초 ${r.start || "권외"}위 → 월말 ${r.end || "권외"}위 (최고 ${r.best || "-"}위)`)
    .join("\n");
  const works = (o.works || []).map((w) => `- [${w.type}] ${w.title}`).join("\n");
  return {
    json: true,
    maxTokens: 2000,
    system: `${SYSTEM_BASE}
지금은 대행사가 고객(사장님)에게 보내는 월간 리포트를 씁니다. 사장님이 30초 안에 '돈 낸 값을 하는구나'를 느끼게, 쉬운 말로 씁니다.
- 숫자는 주어진 것만 사용. 없는 수치·원인을 지어내지 않습니다.
- 나빠진 지표는 숨기지 말고 짧게 인정하고, 다음 달 대응을 붙입니다.
- 마케팅 용어는 풀어서 씁니다(예: 전환율 → 들어온 사람 중 산 비율).`,
    user: `[스토어]
${storeBlock(store)}

[리포트 월] ${o.month}
[핵심 숫자]
${kpis || "(입력 없음)"}
[네이버 쇼핑 순위]
${ranks || "(기록 없음)"}
[이번 달 작업]
${works || "(기록 없음)"}
[대행사 메모] ${o.memo || "없음"}

${JSON_RULE}
형식:
{"headline":"이번 달을 한 문장으로 (40자 이내, 가장 좋은 소식 중심)","summary":"3~4문장 요약","wins":["성과 3개, 각 40자 이내"],"nextPlan":["다음 달 할 일 3~5개, 각 50자 이내, 구체적으로"]}`,
  };
}

function diagnosePrompt(store, o) {
  return {
    json: true,
    maxTokens: 4000,
    system: `${SYSTEM_BASE}
당신은 네이버 스마트스토어 컨설턴트로서 '페이지 분석 보고서'를 씁니다. 읽는 사람은 마케팅을 잘 모르는 사장님입니다.
- 어조: 정중하고 따뜻하게, 사장님의 노력을 존중하며 '함께 개선한다'는 관점. '시급', '심각', '망한다', '최악' 같은 겁주는 표현이나 비꼬는 말은 쓰지 않습니다.
- 아래 [자동 진단 결과]의 숫자와 근거만 사용합니다. 없는 수치(매출 예측, 클릭률 등)를 지어내지 않습니다.
- 사장님이 스스로는 생각 못 했을 연결고리를 짚어 주세요. 예: 마진이 낮은데 광고 낭비가 크다 → 광고부터 정리, 시즌이 다가오는데 순위가 낮다 → 지금 세부 키워드부터.
- 해결책은 '오늘 바로 할 수 있는 행동' 단위로 구체적으로.
- 읽기 쉽게: 한 문장은 40자 안팎으로 짧게 끊고, 한 항목은 2~3문장까지. 어려운 용어(CTR, 전환율, 객단가 등)는 쉬운 말로 바꿉니다 (예: 클릭률→100명 중 몇 명이 눌렀는지).`,
    user: `[스토어]
${storeBlock(store)}

[진단 상품] ${o.productName || "-"}
[대표 키워드] ${o.keyword}

[자동 진단 결과]
${JSON.stringify(o.summary, null, 1)}

${o.detailText ? `[상세페이지 글자 (화면에서 읽은 일부)]\n${String(o.detailText).slice(0, 6000)}\n\n` : ""}${o.hasImages ? "[첨부 이미지] 이 상품의 상세페이지 이미지입니다 (위에서부터 순서대로, 일부는 대표 사진일 수 있음). 대표 키워드로 검색한 고객 입장에서 평가하세요: 첫 화면 3초 안에 '무엇을, 왜 여기서' 사야 하는지 보이는가, 신뢰 요소(후기·인증·원산지·제조과정), 사진 품질, 가격·구성·배송 정보의 명확성, 모바일 가독성(글자 크기·글 밀도), 위험한 광고 표현." : "[첨부 이미지 없음] 상세페이지 이미지는 못 받았어요. 위 '상세페이지 글자'와 상품 정보만으로 detail을 평가하세요. 사진 품질·디자인은 평가하지 말고, 구매 이유·신뢰 정보·구성/배송 안내·불만 예방 안내가 글로 충분한지 봅니다. 글자도 거의 없으면 '상세페이지 내용을 확인하기 어려움'을 warn으로 적고, 이 상품 종류에서 꼭 들어가야 할 정보를 fix에 적으세요."}

${JSON_RULE}
형식:
{"headline":"진단 한 줄 결론 (45자 이내)","tag":"가장 먼저 고칠 점을 2~6자 명사로 (예: 배송비, 상품명, 상세페이지, 리뷰관리). 파일 이름에 씀","summary":"3~4문장. 가장 큰 문제와 가장 큰 기회","top3":[{"title":"지금 해야 할 일 (25자 이내)","why":"근거 (진단 숫자 인용)","how":"구체적 방법 2~3단계","impact":"기대 효과 (정성적으로, 숫자 지어내지 말 것)"}],"hidden":[{"title":"사장님이 놓치고 있던 것 (25자 이내)","detail":"설명 2문장"}],"detail":{"score":0~15 정수,"findings":[{"level":"good|warn|bad","title":"","detail":"","fix":""}]}}
hidden은 2~3개. detail.findings는 반드시 3~5개 (잘된 점과 고칠 점 모두).`,
  };
}

// ---------- 북마크로 가져온 화면 해석 ----------
const EXTRACT_SYSTEM = `당신은 웹페이지에서 보이는 글자를 구조화 데이터로 옮기는 추출기입니다.
- 화면에 실제로 있는 값만 옮깁니다. 없으면 null. 추측·계산 금지.
- 숫자는 숫자로 (쉼표·원·개 제거). ${JSON_RULE}`;

function extractProductPrompt(_store, o) {
  const d = o.page || {};
  return {
    json: true,
    maxTokens: 3000,
    system: EXTRACT_SYSTEM,
    user: `[스마트스토어 상품 페이지에서 가져온 데이터]
주소: ${d.url}
문서 제목: ${d.title}
메타 태그: ${JSON.stringify(d.meta || {})}
페이지 내부 값: ${JSON.stringify(d.pick || {})}
리뷰·평점 단서(화면 라벨에서 따로 모은 것): ${JSON.stringify((d.hints || []).slice(0, 80))}
※ reviews(리뷰 수)·rating(평점)은 '페이지 내부 값'과 '리뷰·평점 단서'를 먼저 보세요. '★4.8', '4.8/5', '평점 4.8', '리뷰 1,234', '(1,234)' 같은 형태예요. '구매 1,000+'·'찜'은 리뷰 수가 아니에요.
${(d.revs || []).length ? `리뷰 글 (화면에서 따로 모은 것, s=별점):\n${d.revs.slice(0, 40).map((v, i) => `${i + 1}. [${v.s ?? "?"}점] ${v.x}`).join("\n")}\n` : ""}화면 글자(앞부분):
${String(d.text || "").slice(0, 22000)}

아래 형식으로 추출하세요.
{"storeName":"스토어 이름","productName":"상품명 전체","price":정가 또는 판매가 숫자,"salePrice":할인 적용 최종가 숫자,"shipFee":배송비 숫자(무료면 0),"freeShipOver":무료배송 조건 금액 또는 null,"reviews":리뷰 수,"rating":평점,"wishCount":찜 수 또는 null,"category":"카테고리 경로(보이면)","options":"옵션/구성 이름 배열 최대 6개. 옵션 선택 영역이 닫혀 있어 목록이 안 보이면 null (빈 배열 아님)","optionPrices":"화면에 옵션 목록이 보이면 [{\"name\":\"옵션 이름\",\"delta\":대표가격 대비 추가금 숫자(예: -12000, 3000, 없으면 0),\"soldOut\":품절이면 true}] 최대 30개, 안 보이면 null","benefits":["혜택·포인트·쿠폰 문구 최대 5개"],"badges":["굿서비스·빠른배송 등 표시"],"claims":["상세페이지·상품정보에 쓰인 효능·품질 주장 문구 원문 최대 15개"],"notices":"원산지·보관방법·소비기한·알레르기 등 표기 원문 요약 (없으면 빈 문자열)","reviewIssues":["리뷰에서 나온 불만·아쉬운 점 최대 4개 (한 번만 나와도 별점 3점 이하면 포함), 없으면 빈 배열"],"reviewPraise":["리뷰에서 반복되는 칭찬 최대 3개"],"reviewNegatives":[{"q":"불만·아쉬움이 담긴 리뷰 원문을 50자 이내로 줄인 것","s":별점 숫자 또는 null}] 최대 5개 (없으면 빈 배열),"reviewScanned":읽은 리뷰 글 개수,"isFood":true/false,"mainKeyword":"고객이 이 상품을 찾을 때 가장 많이 검색할 단어 1개 (예: 무뼈닭발)","subKeywords":["함께 쓰일 세부 검색어 최대 4개"]}
mainKeyword·subKeywords만 예외적으로 상품명을 보고 추정해서 채우세요.`,
  };
}

function extractSearchPrompt(_store, o) {
  const d = o.page || {};
  const cards = d.cards || [];
  // 상품 칸(카드)을 화면 순서대로 받은 경우: 카드마다 한 줄씩만 정리 → 순서·가격이 화면과 같게
  if (cards.length >= 3) {
    return {
      json: true,
      maxTokens: 6000,
      system: EXTRACT_SYSTEM,
      user: `[네이버 쇼핑 검색 결과 — 화면 위에서부터 상품 칸 목록]
검색어: ${o.keyword || "(주소에서 확인)"}
${cards.map((c, i) => `#${i} ${c.x}`).join("\n")}

각 칸에서 상품 1개씩 정리하세요. 상품이 아닌 칸(카테고리·필터·추천 검색어 등)은 빼세요. 순서는 위 번호 순서 그대로.
p = 손님이 실제 내는 가격 (할인가가 있으면 할인가, 가격비교 묶음은 '최저' 가격). 줄 그은 원래 가격은 쓰지 마세요.
'광고' 표시가 있으면 ad=1. '판매처 N'·'쇼핑몰별 최저가' 같은 가격비교 묶음은 cat=1, m은 "가격비교".
rv = 별점 옆 괄호 안 리뷰 수 (예: ★4.89 (753) → 753).
cp = 칸에 보이는 카테고리 경로를 '>'로 이어서 (예: 출산/육아>유아침구>유아베개), 없으면 "".
JSON만, 짧게:
{"keyword":"검색어","total":null,"items":[{"c":칸번호,"t":"상품명 40자까지","p":가격숫자,"m":"판매처","ad":0,"cat":0,"rv":리뷰수 또는 null,"cp":"카테고리 경로"}]}`,
    };
  }
  // 카드를 못 찾은 화면: 전체 글자에서 추출 (링크 주소는 길어서 번호만 받음)
  const links = (d.links || []).slice(0, 120).map((l, i) => `${i}: ${String(l.t || "").slice(0, 60)}`).join("\n");
  return {
    json: true,
    maxTokens: 8000,
    system: EXTRACT_SYSTEM,
    user: `[네이버 쇼핑 검색 결과 화면]
주소: ${d.url}
검색어: ${o.keyword || "(주소에서 확인)"}
상품 링크 목록 (번호: 링크 글자):
${links}
화면 글자:
${String(d.text || "").slice(0, 26000)}

화면에 나온 순서대로 상품을 최대 45개 추출하세요. 검색 결과 목록의 상품만 (추천·함께 본 상품·카테고리 영역은 제외). '광고' 표시가 붙은 상품은 ad=1.
가격은 손님이 실제 내는 가격(할인가). 가격비교(여러 판매처 묶음, '판매처 N' 등) 상품은 cat=1, mall은 "가격비교".
li는 상품 링크 목록에서 같은 상품의 번호 (없으면 null). 상품명(t)은 40자까지만.
JSON만, 공백 없이 짧게:
{"keyword":"검색어","total":전체 상품 수 숫자 또는 null,"items":[{"t":"상품명","p":가격숫자,"m":"판매처","ad":0,"cat":0,"rv":리뷰수 또는 null,"cp":"카테고리 경로(보이면, '>'로 연결)","li":번호 또는 null}]}`,
  };
}

// 연관 키워드 중 '이 상품을 찾는 손님'의 검색어만 남기기 (검색광고 연관 키워드에는 다른 상품 검색어가 섞임)
function kwFilterPrompt(_store, o) {
  return {
    json: true,
    maxTokens: 2500,
    system: "당신은 네이버 쇼핑 키워드 분석가입니다. JSON만 출력합니다.",
    user: `상품명: ${o.productName}
카테고리: ${o.category || "모름"}
대표 키워드: ${o.keyword || ""}

아래는 네이버 검색광고가 준 연관 키워드예요. 이 중에서 '이 상품을 사려는 손님이 실제로 검색할 만한 키워드'만 골라 주세요.
- 다른 품목·다른 용도·다른 대상(예: 방수패드인데 생리대·팬티라이너·여성팬티·아기블랭킷)을 찾는 검색어는 빼세요.
- 상품명에 그 단어가 들어 있어도, 손님이 그 검색어로 이 상품을 사러 오지 않으면 빼세요.
- 브랜드명(다른 회사), 맛집·후기·만들기 같은 정보 검색어도 빼세요.
- 애매하면 빼세요.
키워드: ${(o.keywords || []).join(", ")}

{"keep":["남길 키워드 그대로"]}`,
  };
}

// 구매자 분석 + 상세페이지 연령 적합성 + 후기↔상세페이지 적합성 + 타겟층 나누기
function buyerPrompt(store, o) {
  const hasDetail = o.hasImages || String(o.detailText || "").length > 300;
  return {
    json: true,
    maxTokens: 6000,
    system: `${SYSTEM_BASE}
당신은 네이버 스마트스토어 구매자 분석 전문가입니다. 읽는 사람은 마케팅을 잘 모르는 사장님입니다.
- 숫자는 [구매자 데이터]에 있는 것만 씁니다. 데이터가 없으면 리뷰·상품 특성으로 추정하되 source를 "guess"로 표시합니다.
- 어조: 정중하고 따뜻하게. 겁주는 표현 금지.
- 읽기 쉽게: 한 문장 40자 안팎, 어려운 용어는 쉬운 말로.`,
    user: `[상품] ${o.productName}
[대표 키워드] ${o.keyword}
[카테고리] ${o.category || "모름"}
[구매자 데이터 — 네이버 쇼핑인사이트, 이 키워드 최근 1년 쇼핑 클릭 기준]
${o.buyers ? JSON.stringify(o.buyers) : "없음 (리뷰·상품으로 추정)"}
[상품 정보] ${JSON.stringify(o.product || {})}
[리뷰] ${JSON.stringify(o.reviews || {})}
[검색 상위 경쟁 상품] ${JSON.stringify(o.competitors || [])}
${o.detailText ? `[상세페이지 글자 일부]\n${String(o.detailText).slice(0, 5000)}\n` : ""}${o.hasImages ? "[첨부 이미지] 상세페이지 이미지입니다. 글자 크기·문장 길이·말투·사진 속 인물 나이대·색감이 주 고객과 맞는지 보세요." : "[상세페이지 이미지 없음]"}
${hasDetail ? "" : "※ 상세페이지 내용이 거의 없어요. ageFit·reviewFit은 null로 두고, segments를 특히 자세히 (상세페이지를 만들기 전 기획용)."}

${JSON_RULE}
형식:
{"summary":"누가 이 상품을 사는지 2문장 (데이터 비율 인용)",
 "personas":[{"name":"구매자 유형 이름 (예: 첫 아이 키우는 30대 엄마)","age":"30대","gender":"여성|남성|무관","share":"데이터 비율 (예: 38%) 또는 '추정'","source":"data|review|guess","situation":"언제·왜 사는지 1문장","needs":["원하는 것 2~3개"],"worries":["망설이는 이유 2개"],"trigger":"구매를 결정하게 하는 한 가지"}],
 "ageFit":${hasDetail ? '{"target":"주 고객 (예: 40대 여성)","score":0~10 정수,"verdict":"상세페이지가 이 고객에게 맞는지 한 줄","checks":[{"item":"글자 크기·읽기 편함|말투·단어|사진·모델 나이대|정보 순서·양|신뢰 요소","level":"good|warn|bad","comment":"지금 상태와 이유 1~2문장","fix":"바꾸는 방법 1문장"}]}' : "null"},
 "reviewFit":${hasDetail ? '{"score":0~10 정수,"verdict":"후기와 상세페이지가 같은 이야기를 하는지 한 줄","matched":[{"point":"후기와 상세페이지가 모두 말하는 장점","note":"1문장"}],"missing":[{"point":"후기에서 칭찬하는데 상세페이지에 없는 것","fix":"상세페이지 어디에 어떻게 넣을지"}],"gaps":[{"point":"상세페이지 약속과 후기 불만이 어긋나는 것","fix":"안내 문구·사진 등 해결 방법"}]}' : "null"},
 "segments":[{"name":"타겟층 이름","who":"누구인지 1문장","share":"데이터 비율 또는 '추정'","message":"이 사람에게 먹히는 한 줄 문구","first":"상세페이지 첫 화면에 둘 것","proof":"믿게 만드는 근거 (후기·인증·비교 등)","tone":"말투·디자인 방향"}],
 "priority":"어느 타겟부터 잡아야 하는지와 이유 2문장"}
personas 2~3개, ageFit.checks 4~5개, matched·missing·gaps 각 0~3개 (없으면 빈 배열), segments 3~4개.`,
  };
}

// 진단서 상세 분석 (클라이언트 제안용) — diagnose 와 병렬로 호출
function diagnosePlusPrompt(store, o) {
  return {
    json: true,
    maxTokens: 9000,
    system: `${SYSTEM_BASE}
당신은 네이버 스마트스토어 컨설턴트로, 사장님(클라이언트)에게 보여줄 '페이지 분석 보고서'의 상세 분석 파트를 씁니다.
- 어조: 정중하고 따뜻하게, 사장님이 이미 잘하고 있는 점을 먼저 인정하고 '함께 개선한다'는 관점. 겁주는 표현·과장·강매 느낌 금지.
- 아래 데이터에 있는 숫자·사실만 근거로 씁니다. 매출·전환율 같은 수치 예측은 하지 않습니다.
- 추상적인 조언 대신 '바로 붙여 쓸 수 있는 문구·예시'를 줍니다.
- 읽기 쉽게: 한 문장은 40자 안팎으로 짧게 끊고, 한 항목은 2~3문장까지. 어려운 용어(CTR, 전환율, 객단가 등)는 쉬운 말로 바꿉니다 (예: 클릭률→100명 중 몇 명이 눌렀는지).
- 상품명 제안은 네이버 상품명 가이드(50자 이내, 같은 단어 반복 금지, 상품과 무관한 키워드 금지, 특수문자 남발 금지)를 지킵니다.
- 식품이면 효능·질병 표현 금지.`,
    user: `[스토어]
${storeBlock(store)}

[진단 상품] ${o.productName}
[대표 키워드] ${o.keyword || "-"}
[상품 화면 정보] ${JSON.stringify(o.product || {})}
[검색 상위 경쟁 상품] ${JSON.stringify(o.competitors || [])}
[자동 진단 결과] ${JSON.stringify(o.summary || {}, null, 1)}
[대행사] ${o.agency || "고운기획"}
[검색광고 데이터] ${o.ad ? JSON.stringify(o.ad) : "없음 (검색광고 API 미연결) — 광고 제안은 화면 정보만으로 작성하고 수치는 쓰지 말 것"}

${JSON_RULE}
형식:
{
 "letter":"담당 컨설턴트가 사장님께 드리는 글 5~7문장, 2~3문장마다 줄바꿈(\\n\\n)으로 문단을 나눔. '사장님,'으로 시작. ① 실제로 이 상품 페이지와 검색 결과를 손님 입장에서 꼼꼼히 살펴봤다는 것(구체적으로 무엇을 봤는지 2가지 이상) ② 잘하고 있는 점 1~2개를 구체적 근거와 함께 ③ 가장 큰 개선 기회 1~2개 ④ 작은 것부터 함께 바꿔보자는 따뜻한 마무리. 판매 권유 문장 금지.",
 "strengths":[{"title":"잘하고 있는 점 (20자 이내)","detail":"근거와 함께 1~2문장, 이걸 어떻게 더 살리면 좋은지"}],
 "journey":[{"step":"검색 결과에서 눈에 띄기|클릭 후 첫 화면|상세페이지 확인|구매 결정","status":"good|warn|bad","comment":"이 단계에서 손님이 보는 것과 이탈 이유 1~2문장"}],
 "areaNotes":{"title":"상품명·키워드가 왜 중요한지 + 이 상품의 현재 상태 2~3문장","exposure":"…","price":"…","offer":"…","margin":"…","trust":"…","law":"…","ads":"…","detail":"…"},
 "titleOptions":[{"title":"제안 상품명","point":"무엇을 바꿨고 왜 (1문장)"}],
 "detailPlan":[{"section":"섹션 이름 (예: 첫 화면)","now":"지금 상태 (모르면 빈 문자열)","todo":"넣을 내용","example":"바로 쓸 문구 예시"}],
 "reviewReplies":[{"issue":"반복 불만","reply":"사장님 답글 예시 (2~3문장, 진정성 있게, 해결책 포함)","fix":"근본 해결책 1문장"}],
 "roadmap":{"today":[{"task":"","who":"사장님|대행","effort":"쉬움|보통|어려움"}],"week":[…],"month":[…]},
 "offerIdeas":[{"idea":"구성·가격·혜택·배송 개선 아이디어 (25자 이내)","why":"이 상품·리뷰·경쟁 상황에서 왜 효과적인지 1문장","how":"스마트스토어에서 실제로 하는 방법 1문장"}],
 "adPlan":{"summary":"이 상품 광고 방향 2문장 (어떤 키워드로, 왜)","start":"시작 방법 1~2문장 (예: 하루 예산·기간·어느 광고 상품부터)","groups":[{"name":"광고그룹 이름","channel":"쇼핑검색광고|파워링크","keywords":["키워드"],"why":"이 그룹을 만드는 이유 1문장"}],"negatives":["제외할 키워드 (상품과 무관하거나 구매 의도가 낮은 것)"],"checkpoints":["2주 뒤 확인할 기준 (예: 클릭당 비용, 구매 0건 키워드 정리)"]},
 "offer":[{"service":"함께 진행할 수 있는 개선 작업명 (예: 상세페이지 리뉴얼)","solves":"이 작업으로 무엇이 좋아지는지 1문장 (부드럽게)"}]
}
strengths는 데이터에서 확인되는 것만 2~4개 (없으면 빈 배열). offerIdeas는 4~5개, '옵션/구성 추가' 한 가지에 치우치지 말고 가격 끝자리·묶음/체험 구성·무료배송 조건·쿠폰/적립·리뷰 이벤트·빠른 출고·선물 포장·재구매 혜택·대표 이미지 문구 등 서로 다른 각도로, 이 상품에 실제로 맞는 것만. adPlan의 groups는 2~3개, 키워드는 [검색광고 데이터]에 있는 것을 우선 쓰되 상품과 관련 없는 연관 키워드는 negatives로. 데이터가 없으면 groups의 키워드는 상품명에서 뽑고 수치 언급 금지. journey는 4단계 전부. areaNotes는 데이터가 있는 항목만. titleOptions 3개, detailPlan은 [자동 진단 결과]의 '구매자'(주 고객 연령·성별)에게 맞는 말투·순서로, 반드시 6~8개 (데이터가 부족해도 이 상품 종류에 맞는 구성으로 — 첫 화면, 구매 이유, 차별점, 사용·조리 방법, 신뢰(후기·인증·원산지), 구성·배송, 자주 묻는 질문 등), reviewReplies는 불만이 있을 때만 최대 3개, roadmap 각 2~4개, offer 3~4개.`,
  };
}

const BUILDERS = {
  diagnose_plus: diagnosePlusPrompt,
  extract_product: extractProductPrompt,
  extract_search: extractSearchPrompt,
  kw_filter: kwFilterPrompt,
  buyer: buyerPrompt,
  report: reportPrompt,
  diagnose: diagnosePrompt,
  copy: copyPrompt,
  strategy: strategyPrompt,
  cardnews: cardnewsPrompt,
  shorts: shortsPrompt,
};

export function buildPrompt(task, store, options) {
  const fn = BUILDERS[task];
  if (!fn) throw new Error(`알 수 없는 작업: ${task}`);
  return fn(store || {}, options || {});
}
