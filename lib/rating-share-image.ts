import { posterUrl } from "@/lib/tmdb";
import { getPopScoreTitle, getShareRatingStatement } from "@/lib/popscore-presentation";
import { LOGO_REEL_CIRCLES } from "@/lib/logo-reel";

function canvasTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (line && context.measureText(line + character).width > maxWidth) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D, text: string, x: number, y: number,
  maxWidth: number, lineHeight: number, maxLines: number
) {
  const lines = canvasTextLines(context, text, maxWidth);
  lines.slice(0, maxLines).forEach((value, index) => {
    let visible = value;
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (visible && context.measureText(visible + "…").width > maxWidth) visible = visible.slice(0, -1);
      visible += "…";
    }
    context.fillText(visible, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function getPosterForDownload(movieId: string, posterPath?: string | null) {
  const primaryPoster = posterUrl(posterPath ?? null, "w780");

  if (primaryPoster) {
    return primaryPoster;
  }

  try {
    const response = await fetch(
      `/api/movie-poster?movie=${encodeURIComponent(movieId)}`
    );
    const data = (await response.json()) as { posterPath?: string | null };

    return posterUrl(data.posterPath ?? null, "w780");
  } catch {
    return null;
  }
}

export type RatingShareImageData = {
  movieId: string; movieTitle: string; popscore: number;
  posterPath?: string | null; releaseDate?: string | null; genreNames?: string[];
};

export async function createRatingShareCanvas(data: RatingShareImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const tier = getPopScoreTitle(data.popscore);
  const [poster, bucket, wordmark] = await Promise.all([
    getPosterForDownload(data.movieId, data.posterPath).then(src => src ? loadImage(src).catch(() => null) : null),
    loadImage(tier.iconSrc),
    loadImage("/branding/popscore-wordmark.svg"),
  ]);
  ctx.fillStyle = "#090b0f";
  ctx.fillRect(0, 0, 1080, 1920);
  const glow = ctx.createRadialGradient(160, 1040, 0, 160, 1040, 680);
  glow.addColorStop(0, "rgba(250,204,21,0.055)");
  glow.addColorStop(1, "rgba(250,204,21,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);
  // Use the same vector lettering as the header; the reel remains static in exports.
  const wordmarkScale = 350 / 202;
  ctx.drawImage(wordmark, 80, 185, 350, 24 * wordmarkScale);
  ctx.save();
  ctx.translate(80 + 26 * wordmarkScale, 185);
  ctx.scale(24 * wordmarkScale / 100, 24 * wordmarkScale / 100);
  for (const circle of LOGO_REEL_CIRCLES) {
    ctx.fillStyle = circle.cutout ? "#090b0f" : "#ffc400";
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 23px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("RATED ON POPSCORE", 80, 280);
  ctx.letterSpacing = "0px";
  let titleSize = 78;
  while (titleSize > 42) {
    ctx.font = `800 ${titleSize}px Arial, sans-serif`;
    if (canvasTextLines(ctx, data.movieTitle, 920).length <= 4) break;
    titleSize -= 2;
  }
  ctx.font = `800 ${titleSize}px Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapCanvasText(ctx, data.movieTitle, 80, 416, 920, titleSize * 1.1, 4);
  const metadataY = 416 + Math.max(0, titleLines - 1) * titleSize * 1.1 + 58;
  const year = data.releaseDate?.match(/^\d{4}/)?.[0];
  const metadata = [year, data.genreNames?.join(" / ")].filter(Boolean).join(" • ").toUpperCase();
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 25px Arial, sans-serif";
  ctx.letterSpacing = "3px";
  const metadataLines = wrapCanvasText(ctx, metadata, 80, metadataY, 920, 38, 3);
  ctx.letterSpacing = "0px";
  const contentY = Math.max(620, metadataY + Math.max(0, metadataLines - 1) * 38 + 72);
  const posterWidth = 430;
  const posterHeight = 645;
  // Every element in the rating group shares this column's center, including
  // the combined number + /100 width. It never depends on the score's digits.
  const ratingLeft = 560;
  const ratingWidth = 440;
  const ratingCenter = ratingLeft + ratingWidth / 2;
  ctx.save();
  ctx.shadowColor = "rgba(250,204,21,0.09)";
  ctx.shadowBlur = 35;
  ctx.fillStyle = "#0d1015";
  ctx.beginPath();
  ctx.roundRect(80, contentY, posterWidth, posterHeight, 24);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  if (poster) drawImageContain(ctx, poster, 80, contentY, posterWidth, posterHeight);
  else {
    ctx.fillStyle = "#71717a";
    ctx.font = "500 26px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Poster unavailable", 295, contentY + posterHeight / 2);
  }
  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "600 26px Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("MY POPSCORE", ratingCenter, contentY + 58);
  ctx.letterSpacing = "0px";
  const scoreFont = "900 178px Arial, sans-serif";
  ctx.font = scoreFont;
  const scoreWidth = ctx.measureText(String(data.popscore)).width;
  ctx.font = "500 32px Arial, sans-serif";
  const suffixWidth = ctx.measureText("/100").width;
  const scoreLeft = ratingCenter - (scoreWidth + 12 + suffixWidth) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#facc15";
  ctx.font = scoreFont;
  ctx.fillText(String(data.popscore), scoreLeft, contentY + 244);
  ctx.fillStyle = "#8b8e98";
  ctx.font = "500 32px Arial, sans-serif";
  ctx.fillText("/100", scoreLeft + scoreWidth + 12, contentY + 244);
  drawImageContain(ctx, bucket, ratingCenter - 115, contentY + 284, 230, 222);
  ctx.textAlign = "center";
  ctx.fillStyle = "#facc15";
  ctx.font = "800 29px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(tier.label.toUpperCase(), ratingCenter, contentY + 555, ratingWidth);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#b4b5bc";
  ctx.font = "500 27px Arial, sans-serif";
  wrapCanvasText(ctx, getShareRatingStatement(data.popscore), ratingCenter, contentY + 603, ratingWidth - 25, 37, 2);
  const footerY = Math.max(1460, contentY + posterHeight + 100);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(1000, footerY);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 48px Arial, sans-serif";
  ctx.fillText("What would you score it?", 540, footerY + 125);
  ctx.fillStyle = "#facc15";
  ctx.font = "600 27px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("POPSCOREMOVIES.COM", 540, footerY + 195);
  return canvas;
}
