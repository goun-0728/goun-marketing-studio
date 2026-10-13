"use client";

import { useEffect, useRef, useState } from "react";
import { daysSinceBackup, exportBackup, importBackup, loadProfiles, requestPersist, saveProfiles } from "@/lib/storage";
import { downloadBlob } from "@/lib/client";

export const EMPTY_STORE = {
  name: "",
  category: "",
  channel: "",
  location: "",
  products: "",
  target: "",
  strengths: "",
  price: "",
  event: "",
  tone: "친근하고 신뢰감 있게",
  link: "",
};

const FIELDS = [
  ["name", "상호 / 브랜드명", "예: 맛온", "input"],
  ["category", "업종", "예: 냉동 간편식, 카페, 미용실", "input"],
  ["channel", "판매 채널", "예: 스마트스토어, 오프라인 매장, 자사몰", "input"],
  ["location", "지역 / 상권", "예: 대구 수성구 범어동 (온라인이면 비워도 됨)", "input"],
  ["products", "대표 상품 · 메뉴", "예: 무뼈닭발 500g, 직화막창", "area"],
  ["target", "타겟 고객", "예: 혼술하는 20~30대 직장인", "input"],
  ["strengths", "강점 · 차별점", "예: 국내산 원육, 당일 생산, 리뷰 4.9", "area"],
  ["price", "가격대", "예: 1만원대", "input"],
  ["event", "진행 중 이벤트 / 혜택", "예: 첫 구매 20% 할인, 리뷰 적립금", "input"],
  ["tone", "말투", "예: 친근하게 / 고급스럽게 / 유머러스하게", "input"],
  ["link", "검색 키워드 · 링크", "예: 네이버에서 '맛온 닭발' 검색", "input"],
];

// 고객사(가게) 프로필 — 여러 개 저장해두고 골라 쓰기
export default function StoreProfile({ store, setStore }) {
  const [profiles, setProfiles] = useState({});
  const [current, setCurrent] = useState("");
  const [msg, setMsg] = useState("");
  const [backupDays, setBackupDays] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    requestPersist();
    const p = loadProfiles();
    setProfiles(p);
    setBackupDays(daysSinceBackup());
    const last = localStorage.getItem("gms_last_profile");
    if (last && p[last]) {
      setCurrent(last);
      setStore({ ...EMPTY_STORE, ...p[last] });
    }
  }, [setStore]);

  const persist = (next) => {
    setProfiles(next);
    saveProfiles(next);
  };

  const save = () => {
    const key = (store.name || "").trim();
    if (!key) {
      setMsg("상호명을 입력해야 저장돼요");
      return;
    }
    persist({ ...profiles, [key]: { ...store, updatedAt: new Date().toISOString() } });
    setCurrent(key);
    localStorage.setItem("gms_last_profile", key);
    setMsg("저장했어요");
    setTimeout(() => setMsg(""), 1500);
  };

  const select = (key) => {
    setCurrent(key);
    if (!key) {
      setStore(EMPTY_STORE);
      return;
    }
    setStore({ ...EMPTY_STORE, ...profiles[key] });
    localStorage.setItem("gms_last_profile", key);
  };

  const remove = () => {
    if (!current || !confirm(`'${current}' 프로필을 삭제할까요?`)) return;
    const next = { ...profiles };
    delete next[current];
    persist(next);
    setCurrent("");
    setStore(EMPTY_STORE);
  };

  const set = (k, v) => setStore({ ...store, [k]: v });

  const backup = () => {
    const b = exportBackup();
    const d = new Date();
    const name = `고운스튜디오_백업_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    downloadBlob(new Blob([JSON.stringify(b)], { type: "application/json" }), name);
    setBackupDays(0);
  };

  const restore = async (file) => {
    if (!file) return;
    try {
      const added = importBackup(JSON.parse(await file.text()));
      const p = loadProfiles();
      setProfiles(p);
      setMsg(`불러왔어요 (새 항목 ${added}개 · 기존 데이터는 그대로)`);
    } catch (e) {
      setMsg(e.message);
    }
    setTimeout(() => setMsg(""), 4000);
    if (fileRef.current) fileRef.current.value = "";
  };

  const count = Object.keys(profiles).length;

  return (
    <div className="panel">
      <h2>🏪 스토어 정보</h2>
      <p className="hint">한 번 저장하면 모든 탭에서 이 정보로 만들어요.</p>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={current} onChange={(e) => select(e.target.value)} style={{ flex: 1 }}>
          <option value="">+ 새 스토어</option>
          {Object.keys(profiles)
            .sort()
            .map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
        </select>
        {current && (
          <button className="btn small danger" onClick={remove}>
            삭제
          </button>
        )}
      </div>

      {FIELDS.map(([k, label, ph, type]) => (
        <label className="field" key={k}>
          <span>{label}</span>
          {type === "area" ? (
            <textarea rows={2} value={store[k] || ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
          ) : (
            <input type="text" value={store[k] || ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
          )}
        </label>
      ))}

      <div className="row">
        <button className="btn dark" onClick={save} style={{ flex: 1 }}>
          프로필 저장
        </button>
      </div>
      {msg && <p className="okmsg" style={{ margin: "8px 0 0" }}>{msg}</p>}

      <div className="backup-box">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>💾 데이터 백업</b>
          <span className="hint" style={{ margin: 0 }}>스토어 {count}개</span>
        </div>
        <p className="hint" style={{ margin: "4px 0 8px" }}>
          스토어·리포트·진단 기록은 이 브라우저에 저장돼요. 업데이트해도 지워지지 않지만, 브라우저 기록 삭제·PC 변경에 대비해 가끔 백업하세요.
          {count > 0 && (backupDays == null || backupDays >= 14) && <b style={{ color: "var(--danger)" }}> {backupDays == null ? "아직 백업한 적이 없어요." : `마지막 백업 ${backupDays}일 전.`}</b>}
        </p>
        <div className="row">
          <button className="btn small" onClick={backup}>백업 파일 받기</button>
          <label className="btn small">
            백업 불러오기
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => restore(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}
