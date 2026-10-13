"use client";

// 카드뉴스 페이지별 사진 보관 (브라우저 IndexedDB)
// localStorage는 용량이 작아(약 5MB) 사진을 넣으면 스토어 정보가 저장 안 될 수 있어 따로 둠
const DB = "gms_photos";
const ST = "photos";

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(ST, mode);
    const req = fn(t.objectStore(ST));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const putPhoto = (key, blob) => tx("readwrite", (s) => s.put(blob, key)).catch(() => {});
export const getPhoto = (key) => tx("readonly", (s) => s.get(key)).catch(() => null);
export const delPhoto = (key) => tx("readwrite", (s) => s.delete(key)).catch(() => {});

// 큰 사진은 카드 크기에 맞게 줄여서 저장 (긴 변 1600px, JPEG)
export async function shrinkPhoto(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k);
    cv.height = Math.round(img.naturalHeight * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}
