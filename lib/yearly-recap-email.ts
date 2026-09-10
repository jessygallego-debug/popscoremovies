import type { YearlyMovieActivity } from "@/lib/movie-watch-stats";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hours(minutes: number) {
  if (minutes <= 0) return "—";
  const value = minutes / 60;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} hours`;
}

function metric(label: string, value: string | number) {
  return `<td class="metric" style="box-sizing:border-box;padding:5px;width:33.333%"><div style="background:#0f172a;border:1px solid #263249;border-radius:14px;min-height:76px;padding:14px"><div style="color:#fef08a;font-size:24px;font-weight:900;line-height:1.1">${escapeHtml(String(value))}</div><div style="color:#94a3b8;font-size:10px;font-weight:800;letter-spacing:.09em;margin-top:7px;text-transform:uppercase">${escapeHtml(label)}</div></div></td>`;
}

export function renderYearlyRecapEmail(input: {
  activity: YearlyMovieActivity;
  profileUrl: string;
  unsubscribeUrl: string;
  username: string;
}) {
  const { activity } = input;
  const subject = `🍿 Your ${activity.year} PopScore Movie Recap`;
  const previewText = `${activity.totalWatches} movies watched, ${activity.rewatches} rewatches, and your year in PopScore.`;
  const biggestMonth = activity.biggestMonth
    ? `${MONTHS[activity.biggestMonth.month - 1]} · ${activity.biggestMonth.count} watches`
    : "—";
  const highestRated = activity.highestRatedMovie
    ? `${activity.highestRatedMovie.movieTitle} · ${Math.round(activity.highestRatedMovie.popscore)}%`
    : "—";
  const mostRewatched = activity.mostRewatchedMovie
    ? `${activity.mostRewatchedMovie.title} · ${activity.mostRewatchedMovie.count}×`
    : "—";
  const stats = [
    ["Movies watched", activity.totalWatches],
    ["Unique movies", activity.uniqueMovies],
    ["Rewatches", activity.rewatches],
    ["Screen time", hours(activity.estimatedMinutes)],
    ["Average PopScore", activity.averagePopScore === null ? "—" : `${activity.averagePopScore}%`],
    ["Top genre", activity.topGenre ?? "—"],
  ] as const;

  return {
    html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media only screen and (max-width:520px){.metric{display:block!important;width:100%!important}}</style></head><body style="background:#020617;margin:0;padding:0"><span style="display:none!important;max-height:0;opacity:0;overflow:hidden">${escapeHtml(previewText)}</span><div style="background:#020617;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;margin:0 auto;max-width:680px;padding:28px 12px"><div style="padding:12px 18px 25px;text-align:center"><div style="color:#facc15;font-size:16px;font-weight:900;letter-spacing:.12em">POPSCORE MOVIES</div><h1 style="font-size:34px;line-height:1.15;margin:16px 0 8px">Your ${activity.year} in Movies</h1><p style="color:#cbd5e1;font-size:15px;margin:0">A year worth watching, @${escapeHtml(input.username)}.</p></div><div style="background:linear-gradient(145deg,#111827,#071022);border:1px solid rgba(250,204,21,.38);border-radius:24px;overflow:hidden;padding:18px"><table role="presentation" style="border-collapse:collapse;width:100%"><tr>${stats.slice(0, 3).map(([label, value]) => metric(label, value)).join("")}</tr><tr>${stats.slice(3).map(([label, value]) => metric(label, value)).join("")}</tr></table><div style="border-top:1px solid #263249;margin:18px 5px 0;padding:18px 10px 4px"><p style="color:#94a3b8;font-size:11px;font-weight:800;letter-spacing:.1em;margin:0 0 6px;text-transform:uppercase">Highest Rated</p><p style="font-size:18px;font-weight:900;margin:0 0 18px">${escapeHtml(highestRated)}</p><p style="color:#94a3b8;font-size:11px;font-weight:800;letter-spacing:.1em;margin:0 0 6px;text-transform:uppercase">Most Rewatched</p><p style="font-size:18px;font-weight:900;margin:0 0 18px">${escapeHtml(mostRewatched)}</p><p style="color:#94a3b8;font-size:11px;font-weight:800;letter-spacing:.1em;margin:0 0 6px;text-transform:uppercase">Biggest Movie Month</p><p style="font-size:18px;font-weight:900;margin:0">${escapeHtml(biggestMonth)}</p></div><div style="padding:28px 8px 12px;text-align:center"><a href="${escapeHtml(input.profileUrl)}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:16px;font-weight:900;padding:15px 24px;text-decoration:none">View &amp; Share My Activity</a><p style="color:#facc15;font-size:14px;font-weight:900;margin:20px 0 0">Rate Different. Watch Better.</p></div></div><div style="color:#94a3b8;font-size:12px;line-height:1.55;padding:20px 12px 0;text-align:center">You received this because annual movie recaps are enabled in your PopFile settings.<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#facc15">Unsubscribe from annual recaps</a></div></div></body></html>`,
    previewText,
    subject,
    text: `POPSCORE MOVIES\nYour ${activity.year} in Movies\n\nMovies watched: ${activity.totalWatches}\nUnique movies: ${activity.uniqueMovies}\nRewatches: ${activity.rewatches}\nScreen time: ${hours(activity.estimatedMinutes)}\nAverage PopScore: ${activity.averagePopScore === null ? "—" : `${activity.averagePopScore}%`}\nTop genre: ${activity.topGenre ?? "—"}\n\nHighest rated: ${highestRated}\nMost rewatched: ${mostRewatched}\nBiggest movie month: ${biggestMonth}\n\nView and share: ${input.profileUrl}\n\nRate Different. Watch Better.\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}
