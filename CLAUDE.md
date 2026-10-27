# 고운 마케팅 스튜디오 — 작업 규칙

고운기획(브레드)의 스마트스토어 마케팅 도구. Next.js 15 (App Router, JS) · Vercel · 데이터는 사용자 브라우저(localStorage/IndexedDB).
사용자는 개발자가 아님 → 설명은 쉬운 한국어, 결론 먼저, 짧게.

## 절대 규칙
- `lib/storage.js`의 저장 키(gms_profiles, gms_works, gms_rank_history, gms_report_*, gms_diag_*, gms_out_* 등) 이름을 바꾸지 않는다. 구조 변경은 새 키 추가 + 옛 키에서 옮겨오기.
- API 키는 Vercel 환경변수에만. 코드·채팅에 넣지 않는다.
- 네이버 순위 조작·리워드 트래픽·탐지 회피 기능은 만들지 않는다. 화면 가져오기는 한 번에 한 업체, 사람 속도로.
- 고친 부분만 수정하고, 작업 단위마다 커밋 → `main`에 push (Vercel 자동 배포).
- 수정할 때마다 `lib/version.js` 맨 위에 버전 한 줄 추가 (v 숫자 올리고, 바뀐 것은 짧은 키워드로). 화면 왼쪽 위에 표시됨.
- `lib/bookmarklet.js`를 바꾸면 사용자가 '고운 진단' 버튼을 다시 설치해야 함 → 반드시 알려준다.

## 구조 (방 나누기 기준)
| 영역 | 파일 |
|---|---|
| ① 분석 엔진 | `lib/bookmarklet.js`(화면 수집), `lib/importer.js`, `lib/naver.js`(검색광고·HUB API), `lib/diagnose.js`(점수), `lib/science.js`(데이터 과학), `lib/prompts.js`(AI 지시문), `app/api/*` |
| ② 분석 보고서 화면 | `components/DiagnoseView.js`, `components/DiagnoseTab.js`, `lib/exporter.js`, `lib/naming.js`, `app/d/*`, `app/r/*` |
| ③ 제작 도구 | `components/CopyTab.js`, `CardNewsTab.js`, `ShortsTab.js`, `StrategyTab.js`, `lib/cardnews.js`, `lib/shorts.js`, `lib/draw.js`, `lib/photoStore.js` |
| ④ 공통 | `app/page.js`, `components/StoreProfile.js`, `lib/storage.js`, `lib/client.js`, `lib/usePersist.js` |

## 확인
- `npm run build`로 빌드 확인 후 커밋.
- 실제 네이버 화면·API는 이 환경에서 접속 불가 → 가짜 페이지·mock으로 확인하고, 실제 확인은 사용자에게 요청.
