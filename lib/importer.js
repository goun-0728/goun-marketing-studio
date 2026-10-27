"use client";

// 북마크 버튼이 넘긴 화면 데이터(#gz=...)를 풀어서 저장. 여러 탭에서 같이 보이도록 localStorage 사용.
const KEY = "gms_imports";

export async function decodeGz(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

export function loadImports() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

const slot = (kind) => (kind === "product" ? "product" : kind === "place" ? "place" : "search");

export function saveImport(data) {
  const all = loadImports();
  // 상품 페이지 1개 + 검색 결과 1개만 유지 (가장 최근)
  all[slot(data.kind)] = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // 용량 초과 시 본문 텍스트를 줄여서 재시도
    data.text = String(data.text || "").slice(0, 12000);
    all[slot(data.kind)] = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  }
  return all;
}

export function clearImport(kind) {
  const all = loadImports();
  delete all[kind];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  return all;
}

// 주소창에 #gz= 가 있으면 가져와서 저장하고 주소창 정리. 가져온 데이터 반환(없으면 null)
export async function consumeHashImport() {
  if (typeof location === "undefined" || !location.hash.startsWith("#gz=")) return null;
  const raw = location.hash.slice(4);
  history.replaceState(null, "", location.pathname);
  try {
    const data = await decodeGz(raw);
    saveImport(data);
    // 이 화면을 받은 탭이 '읽기 담당' (여러 스튜디오 탭이 같은 화면을 중복으로 읽지 않게)
    try {
      sessionStorage.setItem(`gms_owner_${slot(data.kind)}:${data.at}`, "1");
    } catch {}
    return data;
  } catch (e) {
    return { error: `가져온 화면을 풀지 못했어요: ${e.message}` };
  }
}

export function searchKeyword(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("query") || u.searchParams.get("q") || "";
  } catch {
    return "";
  }
}

export function productNoFrom(url) {
  return String(url || "").match(/products\/(\d{6,})/)?.[1] || "";
}
