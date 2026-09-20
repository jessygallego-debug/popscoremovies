"use client";

import { useEffect, useRef, useState } from "react";
import { createRatingShareCanvas, type RatingShareImageData } from "@/lib/rating-share-image";

export default function RatingSharePreview({ data }: { data: RatingShareImageData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let current = true;
    createRatingShareCanvas(data).then(canvas => {
      if (current) canvasRef.current?.getContext("2d")?.drawImage(canvas, 0, 0);
    }).catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [data]);
  return (
    <div className="mx-auto mt-5 w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#090b0f]">
      <canvas ref={canvasRef} width={1080} height={1920} role="img" aria-label={`${data.movieTitle}. My PopScore: ${data.popscore} out of 100. What would you score it?`} className="block h-auto w-full" />
      {error ? <p role="alert" className="p-4 text-sm text-slate-300">Could not load the share preview. Please try again.</p> : null}
    </div>
  );
}
