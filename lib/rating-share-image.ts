import { posterUrl } from "@/lib/tmdb";
import { getPopScoreTitle, getShareRatingStatement } from "@/lib/popscore-presentation";
import { LOGO_REEL_CIRCLES } from "@/lib/logo-reel";

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
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
  lines.slice(0, maxLines).forEach((value, index) => {
    let visible = value;
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (visible && context.measureText(visible + "…").width > maxWidth) visible = visible.slice(0, -1);
      visible += "…";
    }
    context.fillText(visible, x, y + index * lineHeight);
  });
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
  const [poster, bucket] = await Promise.all([
    getPosterForDownload(data.movieId, data.posterPath).then(src => src ? loadImage(src).catch(() => null) : null),
    loadImage(tier.iconSrc),
  ]);
  ctx.fillStyle = "#090b0f";
  ctx.fillRect(0, 0, 1080, 1920);
  const glow = ctx.createRadialGradient(160, 1040, 0, 160, 1040, 680);
  glow.addColorStop(0, "rgba(250,204,21,0.055)");
  glow.addColorStop(1, "rgba(250,204,21,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.font = "900 58px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("P", 80, 228);
  const reelX = 83 + ctx.measureText("P").width;
  ctx.save();
  ctx.translate(reelX, 185);
  ctx.scale(0.44, 0.44);
  for (const circle of LOGO_REEL_CIRCLES) {
    ctx.fillStyle = circle.cutout ? "#090b0f" : "#facc15";
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillText("PSCORE", reelX + 47, 228);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 23px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("RATED ON POPSCORE", 80, 280);
  ctx.letterSpacing = "0px";
  let titleSize = 78;
  while (titleSize > 42) {
    ctx.font = `800 ${titleSize}px Arial, sans-serif`;
    if (ctx.measureText(data.movieTitle).width <= 1720) break;
    titleSize -= 2;
  }
  ctx.font = `800 ${titleSize}px Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  wrapCanvasText(ctx, data.movieTitle, 80, 416, 920, titleSize * 1.15, 3);
  const year = data.releaseDate?.match(/^\d{4}/)?.[0];
  const metadata = [year, data.genreNames?.join(" / ")].filter(Boolean).join(" • ").toUpperCase();
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 25px Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText(metadata, 80, 625, 920);
  ctx.letterSpacing = "0px";
  ctx.save();
  ctx.shadowColor = "rgba(250,204,21,0.09)";
  ctx.shadowBlur = 35;
  ctx.fillStyle = "#0d1015";
  ctx.beginPath();
  ctx.roundRect(80, 700, 430, 645, 24);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  if (poster) drawImageContain(ctx, poster, 80, 700, 430, 645);
  else {
    ctx.fillStyle = "#71717a";
    ctx.font = "500 26px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Poster unavailable", 295, 1025);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(80, 700, 430, 645, 24);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "600 26px Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("MY POPSCORE", 570, 758);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#facc15";
  ctx.font = `900 ${data.popscore >= 100 ? 150 : 178}px Arial, sans-serif`;
  ctx.fillText(String(data.popscore), 560, 944);
  const scoreWidth = ctx.measureText(String(data.popscore)).width;
  ctx.fillStyle = "#8b8e98";
  ctx.font = "500 32px Arial, sans-serif";
  ctx.fillText("/100", 570 + scoreWidth, 942);
  drawImageContain(ctx, bucket, 658, 984, 230, 222);
  ctx.textAlign = "center";
  ctx.fillStyle = "#facc15";
  ctx.font = "800 29px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(tier.label.toUpperCase(), 785, 1255, 430);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#b4b5bc";
  ctx.font = "500 27px Arial, sans-serif";
  wrapCanvasText(ctx, getShareRatingStatement(data.popscore), 785, 1303, 415, 37, 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(80, 1460);
  ctx.lineTo(1000, 1460);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 48px Arial, sans-serif";
  ctx.fillText("What would you score it?", 540, 1585);
  ctx.fillStyle = "#facc15";
  ctx.font = "600 27px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("POPSCOREMOVIES.COM", 540, 1655);
  return canvas;
}
