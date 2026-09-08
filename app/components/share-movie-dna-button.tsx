"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { MovieDnaResult } from "@/lib/movie-dna";

type ShareMovieDnaButtonProps = {
  dna: MovieDnaResult;
  isPublic?: boolean;
  percentile: number;
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

export default function ShareMovieDnaButton({
  dna,
  isPublic = true,
  percentile,
  totalMoviesRated,
  username,
}: ShareMovieDnaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [status, setStatus] = useState("");
  const topMovies = dna.rankings["top-rated"].slice(0, 3);
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

  const previewRows = useMemo(
    () => [
      ["Favorite genre", dna.favoriteGenre?.genre ?? dna.mostRatedGenre?.genre ?? "Still forming"],
      ["Average PopScore", `${Math.round(dna.averagePopScore)}%`],
      ["Movies rated", String(totalMoviesRated)],
      ["Percentile", `Top ${percentile}%`],
    ],
    [dna, percentile, totalMoviesRated]
  );

  const createImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = format === "story" ? 1920 : 1350;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(126,34,206,0.22)";
    context.fillRect(0, 0, canvas.width, 330);
    context.strokeStyle = "rgba(250,204,21,0.55)";
    context.lineWidth = 4;
    context.roundRect(52, 52, 976, canvas.height - 104, 40);
    context.stroke();

    context.fillStyle = "#facc15";
    context.font = "900 44px Arial, sans-serif";
    context.fillText("POPSCORE MOVIES", 96, 132);
    context.fillStyle = "#cbd5e1";
    context.font = "800 28px Arial, sans-serif";
    context.fillText(`${username}'s MOVIE DNA`, 96, 190);
    context.fillStyle = "#ffffff";
    context.font = "900 72px Arial, sans-serif";
    drawWrappedText(context, dna.personality ?? "Movie DNA", 96, 280, 880, 78);

    previewRows.forEach(([label, value], index) => {
      const x = 96 + (index % 4) * 222;
      context.fillStyle = "#94a3b8";
      context.font = "800 21px Arial, sans-serif";
      context.fillText(label.toUpperCase(), x, 440);
      context.fillStyle = "#fef08a";
      context.font = "900 31px Arial, sans-serif";
      drawWrappedText(context, value, x, 486, 195, 36);
    });

    context.fillStyle = "#94a3b8";
    context.font = "800 21px Arial, sans-serif";
    context.fillText("TOP GENRES", 96, 565);
    context.fillStyle = "#fef08a";
    context.font = "900 28px Arial, sans-serif";
    context.fillText(
      dna.topGenres.map((genre) => genre.genre).join("  •  ") || "Still forming",
      96,
      606
    );

    context.fillStyle = "#ffffff";
    context.font = "900 36px Arial, sans-serif";
    context.fillText("MY TOP MOVIES", 96, 650);
    topMovies.forEach((movie, index) => {
      const y = (format === "story" ? 820 : 735) + index * (format === "story" ? 170 : 128);
      context.fillStyle = "rgba(255,255,255,0.06)";
      context.roundRect(96, y - 62, 888, 98, 22);
      context.fill();
      context.fillStyle = "#facc15";
      context.font = "900 35px Arial, sans-serif";
      context.fillText(String(index + 1), 126, y);
      context.fillStyle = "#ffffff";
      context.font = "900 30px Arial, sans-serif";
      drawWrappedText(context, movie.movieTitle, 188, y, 610, 34, 1);
      context.fillStyle = "#facc15";
      context.textAlign = "right";
      context.fillText(`${Math.round(movie.popscore)}%`, 948, y);
      context.textAlign = "start";
    });

    context.fillStyle = "#facc15";
    context.font = "900 34px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("popscoremovies.com", 540, canvas.height - 120);
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
      text: `My PopScore Movie DNA is ${dna.personality}.`,
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
                <p className="mt-2 text-3xl font-black">{dna.personality}</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {previewRows.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-black/35 p-2.5">
                      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
                      <p className="mt-1 break-words text-sm font-black text-yellow-200">{value}</p>
                    </div>
                  ))}
                </div>
                <ol className="mt-5 space-y-2">
                  {topMovies.map((movie, index) => (
                    <li key={movie.id} className="flex gap-3 rounded-xl bg-black/35 p-2 text-sm font-black">
                      <span className="text-yellow-300">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{movie.movieTitle}</span>
                      <span className="text-yellow-300">{Math.round(movie.popscore)}%</span>
                    </li>
                  ))}
                </ol>
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
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 text-sm font-black text-yellow-200 transition hover:bg-yellow-400/20"
      >
        Share My Movie DNA
      </button>
      {dialog}
    </>
  );
}
