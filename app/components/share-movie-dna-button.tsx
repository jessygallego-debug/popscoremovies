"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { MovieDnaResult } from "@/lib/movie-dna";
import type { ProfileTopMovie } from "@/lib/profile-store";

type ShareMovieDnaButtonProps = {
  dna: MovieDnaResult;
  isPublic?: boolean;
  percentile: number;
  topMovies: ProfileTopMovie[];
  totalMoviesRated: number;
  username: string;
};

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

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((value, index) => {
    const clipped = index === maxLines - 1 && lines.length > maxLines;
    context.fillText(`${value}${clipped ? "…" : ""}`, x, y + index * lineHeight);
  });
}

function getLoveTags(dna: MovieDnaResult) {
  const traits = [
    { label: "Strong Stories", value: dna.storyAverage },
    { label: "Great Performances", value: dna.actingAverage },
    { label: "High Rewatch Value", value: dna.rewatchAverage },
  ].sort((first, second) => second.value - first.value);
  const favorite = dna.favoriteGenre ?? dna.mostRatedGenre;

  return [
    ...traits.slice(0, 2).map((trait) => trait.label),
    ...(favorite ? [`${favorite.genre} Movies`] : []),
    ...(dna.averagePopScore >= 85 ? ["Standout Favorites"] : []),
  ];
}

export default function ShareMovieDnaButton({
  dna,
  isPublic = true,
  percentile,
  topMovies,
  totalMoviesRated,
  username,
}: ShareMovieDnaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [status, setStatus] = useState("");
  const favoriteGenre = dna.favoriteGenre ?? dna.mostRatedGenre;
  const loveTags = useMemo(() => getLoveTags(dna), [dna]);
  const profilePath = `/profile/${encodeURIComponent(username)}#movie-dna`;
  const publicUrl =
    isPublic && typeof window !== "undefined"
      ? new URL(profilePath, window.location.origin).toString()
      : null;
  const fileName = `${fileSafe(username)}-movie-dna${format === "story" ? "-story" : ""}.png`;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const createImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = format === "story" ? 1920 : 1350;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(126,34,206,0.22)";
    context.fillRect(0, 0, canvas.width, format === "story" ? 390 : 300);
    context.strokeStyle = "rgba(250,204,21,0.55)";
    context.lineWidth = 4;
    context.roundRect(52, 52, 976, canvas.height - 104, 40);
    context.stroke();

    context.fillStyle = "#facc15";
    context.font = "900 44px Arial, sans-serif";
    context.fillText("POPSCORE MOVIES", 96, 132);
    context.fillStyle = "#ffffff";
    context.font = "900 54px Arial, sans-serif";
    context.fillText("YOUR MOVIE DNA", 96, 205);
    context.fillStyle = "#cbd5e1";
    context.font = "700 24px Arial, sans-serif";
    context.fillText(`${username} · A look at what makes you, you.`, 96, 246);
    context.fillStyle = "#94a3b8";
    context.font = "700 19px Arial, sans-serif";
    context.fillText(`${totalMoviesRated} movies rated · Top ${percentile}%`, 96, 282);

    const startY = format === "story" ? 410 : 330;
    const card = (x: number, y: number, width: number, height: number, fill: string) => {
      context.fillStyle = fill;
      context.beginPath();
      context.roundRect(x, y, width, height, 24);
      context.fill();
      context.strokeStyle = "rgba(148,163,184,0.28)";
      context.lineWidth = 2;
      context.stroke();
    };
    const label = (text: string, x: number, y: number, color = "#facc15") => {
      context.fillStyle = color;
      context.font = "900 20px Arial, sans-serif";
      context.fillText(text.toUpperCase(), x, y);
    };

    card(96, startY, 430, 180, "rgba(66,42,3,0.58)");
    label("Favorite Genre", 126, startY + 42);
    context.fillStyle = "#ffffff";
    context.font = "900 43px Arial, sans-serif";
    drawWrappedText(context, favoriteGenre?.genre ?? "Still forming", 126, startY + 98, 370, 46, 1);
    context.fillStyle = "#cbd5e1";
    context.font = "700 21px Arial, sans-serif";
    context.fillText(
      favoriteGenre ? `${favoriteGenre.count} fully rated movies` : "Keep rating to reveal your favorite",
      126,
      startY + 142
    );

    card(554, startY, 430, 180, "rgba(88,28,135,0.45)");
    label("Average PopScore", 584, startY + 42, "#d8b4fe");
    context.fillStyle = "#ffffff";
    context.font = "900 58px Arial, sans-serif";
    context.fillText(`${Math.round(dna.averagePopScore)}%`, 584, startY + 108);
    context.fillStyle = "#cbd5e1";
    context.font = "700 21px Arial, sans-serif";
    context.fillText(`Across ${dna.eligibleRatings.length} full ratings`, 584, startY + 145);

    const topGenresY = startY + 208;
    card(96, topGenresY, 888, 128, "rgba(8,20,38,0.92)");
    label("Most Rated Genres", 126, topGenresY + 38, "#38bdf8");
    context.fillStyle = "#f8fafc";
    context.font = "900 28px Arial, sans-serif";
    context.fillText(
      dna.topGenres.map((genre) => `${genre.genre} (${genre.count})`).join("   •   ") || "Still forming",
      126,
      topGenresY + 88
    );

    const loveY = topGenresY + 156;
    card(96, loveY, 888, 150, "rgba(8,20,38,0.92)");
    label("You Love", 126, loveY + 40, "#fb7185");
    context.fillStyle = "#ffffff";
    context.font = "800 27px Arial, sans-serif";
    drawWrappedText(context, loveTags.join("   •   "), 126, loveY + 91, 825, 34, 2);

    const personalityY = loveY + 178;
    card(96, personalityY, 888, 220, "rgba(59,7,100,0.42)");
    label("Your Movie Personality", 126, personalityY + 42, "#f0abfc");
    context.fillStyle = "#facc15";
    context.font = "900 39px Arial, sans-serif";
    context.fillText(dna.personality ?? "Still forming", 126, personalityY + 98);
    context.fillStyle = "#cbd5e1";
    context.font = "700 24px Arial, sans-serif";
    drawWrappedText(context, dna.personalityDescription, 126, personalityY + 145, 810, 34, 2);

    if (topMovies.length) {
      label("My Top 5 Movies of All Time", 126, personalityY + 260);
      context.font = "800 22px Arial, sans-serif";
      topMovies.slice(0, 5).forEach((movie, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column === 0 ? 126 : 556;
        const y = personalityY + 298 + row * 34;
        context.fillStyle = "#facc15";
        context.fillText(`${index + 1}.`, x, y);
        context.fillStyle = "#ffffff";
        drawWrappedText(context, movie.movieTitle, x + 34, y, 360, 26, 1);
      });
    }

    context.fillStyle = "#facc15";
    context.font = "900 34px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("popscoremovies.com", 540, canvas.height - 90);
    context.textAlign = "start";
    return canvasToBlob(canvas);
  };

  const download = async () => {
    setStatus("Preparing image…");
    const blob = await createImage();
    if (!blob) {
      setStatus("Could not create the image.");
      return;
    }
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Movie DNA image downloaded.");
  };

  const share = async () => {
    setStatus("Preparing image…");
    const blob = await createImage();
    if (!blob) {
      setStatus("Could not create the image.");
      return;
    }
    const file = new File([blob], fileName, { type: "image/png" });
    const data: ShareData = {
      files: [file],
      text: `My PopScore Movie DNA is ${dna.personality ?? "taking shape"}.`,
      ...(publicUrl ? { url: publicUrl } : {}),
    };

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share(data);
        setStatus("Movie DNA ready to share.");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("Sharing was not available. You can download the image instead.");
        }
      }
      return;
    }

    if (publicUrl) {
      await navigator.clipboard.writeText(publicUrl).catch(() => null);
      setStatus("Link copied. You can also download the image.");
    } else {
      setStatus("Download the image to share it privately.");
    }
  };

  const dialog =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Share Movie DNA"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <div className="w-full max-w-lg rounded-3xl border border-yellow-400/30 bg-slate-950 p-5 text-white shadow-2xl shadow-purple-900/30 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
                    Share Movie DNA
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Your taste, in one card</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close share dialog"
                  onClick={() => setIsOpen(false)}
                  className="h-10 w-10 rounded-full border border-white/10 font-black text-slate-300 hover:text-white"
                >
                  X
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-yellow-400/30 bg-purple-950/35 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                  {username}&apos;s Movie DNA
                </p>
                <p className="mt-1 text-sm font-medium text-slate-300">A look at what makes you, you.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-yellow-400/20 bg-yellow-950/25 p-3">
                    <p className="text-[9px] font-black uppercase text-yellow-300">Favorite Genre</p>
                    <p className="mt-1 break-words text-lg font-black text-white">{favoriteGenre?.genre ?? "Still forming"}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{favoriteGenre ? `${favoriteGenre.count} fully rated movies` : "Keep rating"}</p>
                  </div>
                  <div className="rounded-xl border border-purple-400/20 bg-purple-900/25 p-3">
                    <p className="text-[9px] font-black uppercase text-purple-300">Average PopScore</p>
                    <p className="mt-1 text-2xl font-black text-white">{Math.round(dna.averagePopScore)}%</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">Across {dna.eligibleRatings.length} full ratings</p>
                  </div>
                </div>
                <div className="mt-2 rounded-xl bg-black/35 p-3">
                  <p className="text-[9px] font-black uppercase text-sky-300">Most Rated Genres</p>
                  <p className="mt-1 text-xs font-black text-white">{dna.topGenres.map((genre) => `${genre.genre} (${genre.count})`).join(" · ") || "Still forming"}</p>
                </div>
                <div className="mt-2 rounded-xl bg-black/35 p-3">
                  <p className="text-[9px] font-black uppercase text-rose-300">You Love</p>
                  <p className="mt-1 text-xs font-black text-white">{loveTags.join(" · ")}</p>
                </div>
                <div className="mt-2 rounded-xl border border-purple-400/20 bg-purple-900/20 p-3">
                  <p className="text-[9px] font-black uppercase text-purple-300">Your Movie Personality</p>
                  <p className="mt-1 text-lg font-black text-yellow-300">{dna.personality ?? "Still forming"}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-300">{dna.personalityDescription}</p>
                </div>
                {topMovies.length ? (
                  <div className="mt-2 rounded-xl bg-black/35 p-3">
                    <p className="text-[9px] font-black uppercase text-yellow-300">My Top 5 Movies of All Time</p>
                    <ol className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-black text-white">
                      {topMovies.slice(0, 5).map((movie, index) => (
                        <li key={movie.movieId} className="truncate"><span className="mr-1 text-yellow-300">{index + 1}.</span>{movie.movieTitle}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                  popscoremovies.com
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Social image format">
                <button
                  type="button"
                  aria-pressed={format === "feed"}
                  onClick={() => setFormat("feed")}
                  className={`min-h-10 rounded-xl border text-xs font-black ${format === "feed" ? "border-yellow-300 bg-yellow-400 text-black" : "border-slate-700 text-slate-300"}`}
                >
                  Feed Post · 4:5
                </button>
                <button
                  type="button"
                  aria-pressed={format === "story"}
                  onClick={() => setFormat("story")}
                  className={`min-h-10 rounded-xl border text-xs font-black ${format === "story" ? "border-yellow-300 bg-yellow-400 text-black" : "border-slate-700 text-slate-300"}`}
                >
                  Story / Reel · 9:16
                </button>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={share} className="min-h-12 rounded-2xl bg-yellow-400 px-4 font-black text-black hover:bg-yellow-300">
                  Share
                </button>
                <button type="button" onClick={download} className="min-h-12 rounded-2xl border border-yellow-400/35 bg-yellow-400/10 px-4 font-black text-yellow-200 hover:bg-yellow-400/15">
                  Download Image
                </button>
              </div>
              {status ? <p role="status" className="mt-3 text-center text-sm font-bold text-slate-300">{status}</p> : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus("");
          setIsOpen(true);
        }}
        className="inline-flex min-h-9 w-fit self-start items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-3 text-xs font-black text-yellow-200 transition hover:bg-yellow-400/20 sm:min-h-11 sm:self-auto sm:rounded-2xl sm:px-4 sm:text-sm"
      >
        <span className="sm:hidden">Share DNA</span>
        <span className="hidden sm:inline">Share My Movie DNA</span>
      </button>
      {dialog}
    </>
  );
}
