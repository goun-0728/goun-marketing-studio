// 서버·브라우저 공용 작은 함수들
export function monthLabel(month) {
  const [y, m] = String(month || "").split("-");
  return y && m ? `${y}년 ${Number(m)}월` : "";
}
