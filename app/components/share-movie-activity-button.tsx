"use client";

import { useState } from "react";
import type { YearlyMovieActivity } from "@/lib/movie-watch-stats";

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

function fileSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "popscore";
}

function screenTime(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hours`;
}

export default function ShareMovieActivityButton({
  activity,
  isOwnProfile,
  username,
}: {
  activity: YearlyMovieActivity;
  isOwnProfile: boolean;
  username: string;
}) {
  const [status, setStatus] = useState("");
  const profilePath = `/profile/${encodeURIComponent(username)}?tab=stats&activityYear=${activity.year}#movie-activity`;

  const createImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const metrics = [
      ["MOVIES WATCHED", String(activity.totalWatches)],
      ["UNIQUE MOVIES", String(activity.uniqueMovies)],
      ["REWATCHES", String(activity.rewatches)],
      ["SCREEN TIME", screenTime(activity.estimatedMinutes)],
      ["AVERAGE POPSCORE", activity.averagePopScore === null ? "—" : `${activity.averagePopScore}%`],
      ["TOP GENRE", activity.topGenre ?? "—"],
    ];

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(250,204,21,.22)");
    gradient.addColorStop(0.55, "rgba(126,34,206,.24)");
    gradient.addColorStop(1, "rgba(2,6,23,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(250,204,21,.62)";
    context.lineWidth = 4;
    context.roundRect(52, 52, 976, 1246, 42);
    context.stroke();

    context.fillStyle = "#facc15";
    context.font = "900 44px Arial, sans-serif";
    context.fillText("POPSCORE MOVIES", 96, 140);
    context.fillStyle = "#94a3b8";
    context.font = "800 25px Arial, sans-serif";
    context.fillText(`@${username.toUpperCase()}`, 96, 192);
    context.fillStyle = "#ffffff";
    context.font = "900 82px Arial, sans-serif";
    context.fillText(`MY ${activity.year}`, 96, 300);
    context.fillText("IN MOVIES", 96, 390);

    metrics.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 96 + column * 454;
      const y = 525 + row * 190;
      context.fillStyle = "rgba(15,23,42,.78)";
      context.roundRect(x, y - 68, 410, 145, 22);
      context.fill();
      context.fillStyle = "#94a3b8";
      context.font = "800 20px Arial, sans-serif";
      context.fillText(label, x + 24, y - 28);
      context.fillStyle = "#fef08a";
      context.font = "900 39px Arial, sans-serif";
      context.fillText(value.length > 18 ? `${value.slice(0, 17)}…` : value, x + 24, y + 32);
    });

    context.fillStyle = "#94a3b8";
    context.font = "800 20px Arial, sans-serif";
    context.fillText("HIGHEST RATED", 96, 1105);
    context.fillStyle = "#ffffff";
    context.font = "900 35px Arial, sans-serif";
    const highest = activity.highestRatedMovie;
    const highestLabel = highest
      ? `${highest.movieTitle.slice(0, 32)}${highest.movieTitle.length > 32 ? "…" : ""}  ${Math.round(highest.popscore)}%`
      : "Still waiting for a rating";
    context.fillText(highestLabel, 96, 1155);
    context.fillStyle = "#facc15";
    context.font = "900 29px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("Rate Different. Watch Better.", 540, 1242);
    context.textAlign = "start";

    return canvasToBlob(canvas);
  };

  const share = async () => {
    setStatus("Preparing your recap…");
    const blob = await createImage();
    if (!blob) {
      setStatus("Could not create the recap image.");
      return;
    }

    const url = new URL(profilePath, window.location.origin).toString();
    const file = new File([blob], `${fileSafe(username)}-${activity.year}-movie-activity.png`, { type: "image/png" });
    const shareData: ShareData = {
      files: [file],
      text: `My ${activity.year} in movies: ${activity.totalWatches} watched, ${activity.averagePopScore ?? "—"}% average PopScore.`,
      url,
    };

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share(shareData);
        setStatus("Movie activity ready to share.");
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
    setStatus("Recap image downloaded and profile link copied.");
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={activity.totalWatches === 0}
        onClick={() => void share()}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-3 text-xs font-black text-yellow-200 transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
      >
        {isOwnProfile ? "Share My Activity" : "Share Activity"}
      </button>
      {status ? <p role="status" className="max-w-52 text-right text-[10px] font-bold text-slate-400">{status}</p> : null}
    </div>
  );
}
