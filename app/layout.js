import "./globals.css";

export const metadata = {
  title: "고운 마케팅 스튜디오",
  description: "가게·스토어 홍보 카피, 전략 리포트, 카드뉴스, 숏폼 자동 편집을 AI로",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
