// 캔버스 공통 그리기 도구 (카드뉴스·숏폼 공용)

export const FONT = `"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`800 60px ${FONT}`, "가나다"),
      document.fonts.load(`500 40px ${FONT}`, "가나다"),
    ]);
  } catch {}
}

export function font(weight, size) {
  return `${weight} ${size}px ${FONT}`;
}

// 한국어 줄바꿈: 띄어쓰기 단위로 끊되, 한 단어가 너무 길면 글자 단위로 끊는다. \n 존중.
export function wrapLines(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    const words = para.split(/(\s+)/).filter((w) => w.length);
    let line = "";
    for (const w of words) {
      if (ctx.measureText(line + w).width <= maxWidth) {
        line += w;
        continue;
      }
      if (line.trim()) out.push(line.trim());
      line = w.trimStart();
      // 단어 자체가 한 줄보다 길면 글자 단위로 자르기
      while (line && ctx.measureText(line).width > maxWidth) {
        let n = 1;
        while (n < line.length && ctx.measureText(line.slice(0, n + 1)).width <= maxWidth) n++;
        out.push(line.slice(0, n));
        line = line.slice(n);
      }
    }
    if (line.trim() || !words.length) out.push(line.trim());
  }
  return out;
}

// 여러 줄 텍스트. align: left|center. 반환값: 그려진 높이
export function drawText(ctx, text, x, y, maxWidth, lineHeight, { align = "left", stroke = 0, strokeColor = "#000", maxLines = 99 } = {}) {
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  let lines = wrapLines(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,1}$/, "…");
  }
  lines.forEach((l, i) => {
    if (stroke) {
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(l, x, y + i * lineHeight);
    }
    ctx.fillText(l, x, y + i * lineHeight);
  });
  return lines.length * lineHeight;
}

export function measureLines(ctx, text, maxWidth) {
  return wrapLines(ctx, text, maxWidth).length;
}

// 원본 비율 유지하며 영역을 꽉 채우기(가운데 크롭). zoom>1이면 확대
export function drawCover(ctx, src, x, y, w, h, zoom = 1, srcW, srcH) {
  const sw = srcW || src.videoWidth || src.naturalWidth || src.width;
  const sh = srcH || src.videoHeight || src.naturalHeight || src.height;
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh) * zoom;
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// 영역 안에 전체가 보이게(레터박스)
export function drawContain(ctx, src, x, y, w, h, zoom = 1) {
  const sw = src.videoWidth || src.naturalWidth || src.width;
  const sh = src.videoHeight || src.naturalHeight || src.height;
  if (!sw || !sh) return;
  const scale = Math.min(w / sw, h / sh) * zoom;
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function loadImage(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  });
}
