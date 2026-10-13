import { drawCover, drawText, font, measureLines, roundRect, wrapLines } from "./draw";

export const W = 1080;
export const H = 1350; // 인스타 4:5

export const THEMES = {
  clean: { label: "클린", bg: "#ffffff", fg: "#1b1a17", sub: "#6f6b63" },
  cream: { label: "크림", bg: "#f6efe3", fg: "#2b2219", sub: "#7a6a58" },
  dark: { label: "다크", bg: "#141414", fg: "#ffffff", sub: "#b9b4aa" },
  bold: { label: "컬러", bg: null, fg: "#ffffff", sub: "rgba(255,255,255,0.85)" }, // bg = 포인트 색
};

/**
 * slide: {type, headline, sub, body}
 * opts: {theme, accent, brand, img (HTMLImageElement|null), index, total}
 */
export function renderSlide(canvas, slide, opts) {
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  const t = THEMES[opts.theme] || THEMES.clean;
  const accent = opts.accent || "#e8572a";
  const hasImg = !!opts.img;
  const fg = hasImg ? "#ffffff" : t.fg;
  const sub = hasImg ? "rgba(255,255,255,0.88)" : t.sub;
  const pad = 96;
  const maxW = W - pad * 2;
  const type = slide.type || "content";

  // 배경
  c.fillStyle = t.bg || accent;
  c.fillRect(0, 0, W, H);
  if (hasImg) {
    drawCover(c, opts.img, 0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    if (type === "cover") {
      g.addColorStop(0, "rgba(0,0,0,0.15)");
      g.addColorStop(0.45, "rgba(0,0,0,0.25)");
      g.addColorStop(1, "rgba(0,0,0,0.8)");
    } else {
      g.addColorStop(0, "rgba(0,0,0,0.62)");
      g.addColorStop(1, "rgba(0,0,0,0.72)");
    }
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  // 상단 브랜드
  c.fillStyle = fg;
  c.font = font(700, 30);
  c.textBaseline = "top";
  c.textAlign = "left";
  if (opts.brand) c.fillText(opts.brand, pad, 72);
  // 페이지 표시
  c.textAlign = "right";
  c.font = font(600, 28);
  c.fillStyle = sub;
  c.fillText(`${opts.index + 1} / ${opts.total}`, W - pad, 74);

  const pointColor = opts.theme === "bold" && !hasImg ? "#fff" : accent;

  if (type === "cover") {
    // 아래쪽 정렬 큰 제목
    c.font = font(850, 104);
    const hl = Math.min(measureLines(c, slide.headline, maxW), 4);
    c.font = font(600, 44);
    const sl = slide.sub ? Math.min(measureLines(c, slide.sub, maxW), 2) : 0;
    const blockH = hl * 124 + (sl ? 40 + sl * 60 : 0);
    let y = H - 150 - blockH;
    // 포인트 바
    c.fillStyle = pointColor;
    c.fillRect(pad, y - 48, 90, 12);
    c.fillStyle = fg;
    c.font = font(850, 104);
    y += drawText(c, slide.headline, pad, y, maxW, 124, { maxLines: 4 });
    if (slide.sub) {
      c.fillStyle = sub;
      c.font = font(600, 44);
      drawText(c, slide.sub, pad, y + 40, maxW, 60, { maxLines: 2 });
    }
  } else if (type === "cta") {
    c.font = font(850, 84);
    const hl = Math.min(measureLines(c, slide.headline, maxW), 3);
    c.font = font(500, 42);
    const bl = slide.body ? Math.min(measureLines(c, slide.body, maxW), 4) : 0;
    const boxH = 110;
    const blockH = hl * 104 + (bl ? 40 + bl * 62 : 0) + (slide.sub ? 70 + boxH : 0);
    let y = (H - blockH) / 2;
    c.fillStyle = fg;
    c.font = font(850, 84);
    y += drawText(c, slide.headline, W / 2, y, maxW, 104, { align: "center", maxLines: 3 });
    if (slide.body) {
      c.fillStyle = sub;
      c.font = font(500, 42);
      y += 40 + drawText(c, slide.body, W / 2, y + 40, maxW, 62, { align: "center", maxLines: 4 });
    }
    if (slide.sub) {
      y += 70;
      c.font = font(800, 44);
      const tw = Math.min(c.measureText(slide.sub).width + 100, maxW);
      c.fillStyle = pointColor;
      roundRect(c, (W - tw) / 2, y, tw, boxH, boxH / 2);
      c.fill();
      c.fillStyle = opts.theme === "bold" && !hasImg ? opts.accent : "#fff";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(wrapLines(c, slide.sub, tw - 60)[0] || "", W / 2, y + boxH / 2 + 2);
    }
  } else {
    // content: 번호 + 제목 + 본문, 세로 가운데
    c.font = font(800, 76);
    const hl = Math.min(measureLines(c, slide.headline, maxW), 3);
    c.font = font(500, 44);
    const bl = slide.body ? Math.min(measureLines(c, slide.body, maxW), 7) : 0;
    const subH = slide.sub ? 70 : 0;
    const blockH = 120 + subH + hl * 96 + (bl ? 48 + bl * 68 : 0);
    let y = Math.max(200, (H - blockH) / 2);
    c.fillStyle = pointColor;
    c.font = font(900, 72);
    c.textAlign = "left";
    c.fillText(String(opts.index).padStart(2, "0"), pad, y);
    y += 120;
    if (slide.sub) {
      c.fillStyle = pointColor;
      c.font = font(700, 38);
      drawText(c, slide.sub, pad, y, maxW, 50, { maxLines: 1 });
      y += subH;
    }
    c.fillStyle = fg;
    c.font = font(800, 76);
    y += drawText(c, slide.headline, pad, y, maxW, 96, { maxLines: 3 });
    if (slide.body) {
      c.fillStyle = sub;
      c.font = font(500, 44);
      drawText(c, slide.body, pad, y + 48, maxW, 68, { maxLines: 7 });
    }
  }
}
