"use client";

import { useState } from "react";
import type { ProfileTopMovie } from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
}

function fileSafe(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "movie-fan"
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const timeout = window.setTimeout(
      () => reject(new Error("Poster load timed out.")),
      12000
    );
    image.crossOrigin = "anonymous";
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Poster could not be loaded."));
    };
    image.src = src;
  });
}

async function loadMoviePoster(movie: ProfileTopMovie) {
  const primaryPoster = posterUrl(movie.posterPath ?? null, "w342");

  if (primaryPoster) {
    try {
      return await loadImage(primaryPoster);
    } catch {
      // Recover below using the movie id, just like the visible poster component.
    }
  }

  try {
    const params = new URLSearchParams({ movie: movie.movieId });

    if (movie.posterPath) {
      params.set("failed", movie.posterPath);
    }

    const response = await fetch(`/api/movie-poster?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { posterPath?: string | null };
    const recoveredPoster = posterUrl(data.posterPath ?? null, "w342");

    if (!recoveredPoster || recoveredPoster === primaryPoster) {
      return null;
    }

    return await loadImage(recoveredPoster);
  } catch {
    return null;
  }
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }

    if (line) {
      lines.push(line);
      line = "";
    }

    for (const character of word) {
      if (context.measureText(line + character).width > maxWidth && line) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  });

  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    let lastLine = visibleLines[maxLines - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    visibleLines[maxLines - 1] = `${lastLine}…`;
  }

  visibleLines.forEach((value, index) => {
    context.fillText(value, x, y + index * lineHeight);
  });
}

function drawPoster(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, 20);
  context.clip();
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  context.restore();
}

export default function ShareTopMoviesButton({
  isOwnProfile,
  movies,
  username,
}: {
  isOwnProfile: boolean;
  movies: ProfileTopMovie[];
  username: string;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState("");
  const visibleMovies = movies.slice(0, 5);
  const profilePath = `/profile/${encodeURIComponent(username)}?tab=stats#top-five-movies`;

  const createImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const glow = context.createRadialGradient(540, 180, 20, 540, 460, 900);
    glow.addColorStop(0, "rgba(250,204,21,0.24)");
    glow.addColorStop(0.5, "rgba(126,34,206,0.2)");
    glow.addColorStop(1, "rgba(2,6,23,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(250,204,21,0.58)";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(50, 50, 980, 1250, 42);
    context.stroke();

    context.fillStyle = "#facc15";
    context.font = "900 40px Arial, sans-serif";
    context.fillText("POPSCORE MOVIES", 88, 122);
    context.fillStyle = "#ffffff";
    context.font = "900 52px Arial, sans-serif";
    context.fillText("TOP 5 MOVIES OF ALL TIME", 88, 198);
    context.fillStyle = "#cbd5e1";
    context.font = "800 25px Arial, sans-serif";
    context.fillText(`@${username}`, 90, 238);

    const posterImages = await Promise.all(
      visibleMovies.map((movie) => loadMoviePoster(movie))
    );
    const positions = [
      { x: 90, y: 280 },
      { x: 420, y: 280 },
      { x: 750, y: 280 },
      { x: 255, y: 750 },
      { x: 585, y: 750 },
    ];

    positions.forEach((position, index) => {
      const movie = visibleMovies[index];
      const image = posterImages[index];
      const posterWidth = 240;
      const posterHeight = 350;

      if (movie && image) {
        drawPoster(
          context,
          image,
          position.x,
          position.y,
          posterWidth,
          posterHeight
        );
      } else {
        context.fillStyle = "#0f172a";
        context.beginPath();
        context.roundRect(
          position.x,
          position.y,
          posterWidth,
          posterHeight,
          20
        );
        context.fill();
        context.fillStyle = "#64748b";
        context.font = "900 25px Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(
          movie ? "NO POSTER" : "OPEN SPOT",
          position.x + posterWidth / 2,
          position.y + posterHeight / 2
        );
        context.textAlign = "start";
      }

      context.strokeStyle = "rgba(148,163,184,0.3)";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(position.x, position.y, posterWidth, posterHeight, 20);
      context.stroke();

      context.fillStyle = "rgba(2,6,23,0.92)";
      context.beginPath();
      context.arc(position.x + 12, position.y + 12, 25, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fde047";
      context.lineWidth = 3;
      context.stroke();
      context.fillStyle = "#fde047";
      context.font = "900 27px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(
        String(index + 1),
        position.x + 12,
        position.y + 21
      );
      context.textAlign = "start";

      context.fillStyle = movie ? "#ffffff" : "#94a3b8";
      context.font = "700 19px Arial, sans-serif";
      context.textAlign = "center";
      if (movie) {
        drawWrappedText(
          context,
          movie.movieTitle,
          position.x + posterWidth / 2,
          position.y + posterHeight + 34,
          posterWidth - 8,
          26,
          2
        );
      } else {
        context.fillText(
          "Choose a movie",
          position.x + posterWidth / 2,
          position.y + posterHeight + 34
        );
      }
      context.textAlign = "start";
    });

    context.fillStyle = "#facc15";
    context.font = "900 29px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("Rate Different. Watch Better.", 540, 1245);
    context.fillStyle = "#94a3b8";
    context.font = "800 21px Arial, sans-serif";
    context.fillText("popscoremovies.com", 540, 1278);
    context.textAlign = "start";

    return canvasToBlob(canvas);
  };

  const share = async () => {
    setIsSharing(true);
    setStatus("Preparing your Top 5…");

    try {
      const blob = await createImage();
      if (!blob) {
        setStatus("Could not create the Top 5 image.");
        return;
      }

      const file = new File(
        [blob],
        `${fileSafe(username)}-top-5-movies.png`,
        { type: "image/png" }
      );
      const url = new URL(profilePath, window.location.origin).toString();
      const rankedMovies = visibleMovies
        .map((movie, index) => `${index + 1}. ${movie.movieTitle}`)
        .join("\n");
      const shareData: ShareData = {
        files: [file],
        text: `${
          isOwnProfile ? "My" : `@${username}'s`
        } Top 5 Movies of All Time on PopScore:\n${rankedMovies}`,
        url,
      };

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share(shareData);
          setStatus("Your Top 5 is ready to share.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setStatus("");
            return;
          }
        }
      }

      await navigator.clipboard.writeText(url).catch(() => null);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(href);
      setStatus("Top 5 image downloaded and PopFile link copied.");
    } catch {
      setStatus("Could not prepare the Top 5 share image.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label={isOwnProfile ? "Share My Top 5" : `Share ${username}'s Top 5`}
        disabled={isSharing || visibleMovies.length === 0}
        onClick={() => void share()}
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-400/10 px-3 text-xs font-black text-purple-200 transition hover:bg-purple-400/20 disabled:cursor-wait disabled:opacity-50 sm:min-h-10 sm:px-4"
      >
        <span className="sm:hidden">Share</span>
        <span className="hidden sm:inline">Share Top 5</span>
      </button>
      {status ? (
        <p role="status" className="max-w-56 text-right text-[10px] font-bold text-slate-400">
          {status}
        </p>
      ) : null}
    </div>
  );
}
