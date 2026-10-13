"use client";

import { useEffect, useState } from "react";

// 브라우저에 저장되는 state — 탭을 옮기거나 새로고침해도 유지, '다시 생성'을 누를 때만 바뀜.
// key가 바뀌면(예: 다른 스토어 선택) 그 key에 저장된 값을 불러옴.
// 저장 키는 "gms_out_" 로 시작 (lib/storage.js 백업 대상)
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(initial);
  const [loadedKey, setLoadedKey] = useState(null);

  useEffect(() => {
    let next = initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) next = JSON.parse(raw);
    } catch {}
    setValue(next);
    setLoadedKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (loadedKey !== key) return; // 다른 key의 값을 덮어쓰지 않도록, 불러오기 끝난 뒤에만 저장
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, loadedKey, value]);

  return [value, setValue];
}

export const outKey = (tab, store) => `gms_out_${tab}_${String(store || "_").trim() || "_"}`;
