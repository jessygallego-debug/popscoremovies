import { absoluteUrl } from "@/lib/site-url";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

export type MonthlyWatchlistCategory =
  | "digital"
  | "subscription_streaming";

export type MonthlyWatchlistMovie = {
  availabilityType: "rent_buy" | "subscription";
  category: MonthlyWatchlistCategory;
  displayOrder: number;
  movieId: string;
  movieTitle: string;
  posterPath: string;
  provider: string | null;
  rankingScore: number;
  releaseDate: string;
  sourceUrl: string;
  verifiedAt: string;
};

export type MonthlyWatchlistEmail = {
  html: string;
  previewText: string;
  subject: string;
  text: string;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function availabilityLine(movie: MonthlyWatchlistMovie, sendDate: string) {
  const isAvailable = movie.releaseDate <= sendDate;

  if (movie.category === "digital") {
    return isAvailable
      ? "Available Now"
      : `Available ${displayDate(movie.releaseDate)}`;
  }

  return isAvailable
    ? "Streaming Now"
    : `Streaming ${displayDate(movie.releaseDate)}`;
}

function movieCard(movie: MonthlyWatchlistMovie, sendDate: string) {
  const image = posterUrl(movie.posterPath, "w342");
  const movieUrl = absoluteUrl(
    movieHref({ id: movie.movieId, title: movie.movieTitle })
  );
  const availability = availabilityLine(movie, sendDate);
  const service = movie.category === "digital" ? "Rent / Buy" : movie.provider;

  return `
    <div class="movie-card" style="display:inline-block;vertical-align:top;width:48%;padding:0 1% 22px;box-sizing:border-box">
      <div style="background:#0f172a;border:1px solid #263249;border-radius:16px;overflow:hidden;text-align:left">
        <img src="${escapeHtml(image ?? "")}" width="280" alt="${escapeHtml(movie.movieTitle)} poster" style="border:0;display:block;height:auto;width:100%;aspect-ratio:2/3;object-fit:cover" />
        <div style="padding:16px">
          <h3 style="color:#f8fafc;font-size:18px;line-height:1.25;margin:0 0 10px">${escapeHtml(movie.movieTitle)}</h3>
          <p style="color:#facc15;font-size:14px;font-weight:800;line-height:1.4;margin:0 0 4px">${escapeHtml(availability)}</p>
          <p style="color:#cbd5e1;font-size:14px;line-height:1.4;margin:0 0 16px">${escapeHtml(service ?? "")}</p>
          <a href="${escapeHtml(movieUrl)}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:14px;font-weight:800;padding:12px 18px;text-decoration:none">View on PopScore</a>
        </div>
      </div>
    </div>`;
}

function movieSection(input: {
  heading: string;
  movies: MonthlyWatchlistMovie[];
  sendDate: string;
  subtitle: string;
}) {
  if (input.movies.length === 0) {
    return "";
  }

  return `
    <div style="padding:28px 16px 4px">
      <p style="color:#facc15;font-size:12px;font-weight:900;letter-spacing:.16em;margin:0;text-transform:uppercase">${escapeHtml(input.heading)}</p>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.5;margin:7px 0 20px">${escapeHtml(input.subtitle)}</p>
      <div style="font-size:0;margin:0 -1%">${input.movies
        .map((movie) => movieCard(movie, input.sendDate))
        .join("")}</div>
    </div>`;
}

export function monthlyWatchlistSubject(month: number) {
  return `🍿 ${MONTH_NAMES[month - 1]}'s PopScore Watchlist Is Here`;
}

export function renderMonthlyWatchlistEmail(input: {
  month: number;
  movies: MonthlyWatchlistMovie[];
  sendDate: string;
  unsubscribeUrl: string;
  year: number;
}): MonthlyWatchlistEmail {
  const monthName = MONTH_NAMES[input.month - 1];
  const digitalMovies = input.movies
    .filter((movie) => movie.category === "digital")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const streamingMovies = input.movies
    .filter((movie) => movie.category === "subscription_streaming")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const subject = monthlyWatchlistSubject(input.month);
  const previewText =
    "New digital releases, new streaming arrivals, and your next movie night.";
  const movieMatchUrl = absoluteUrl("/discover");
  const logoUrl = absoluteUrl("/rating-icons/extra-buttery-v2.png");
  const textSections = [
    digitalMovies.length
      ? `COMING TO DIGITAL\nMovies arriving to Rent or Buy this month\n\n${digitalMovies
          .map(
            (movie) =>
              `${movie.movieTitle}\n${availabilityLine(movie, input.sendDate)}\nRent / Buy\n${absoluteUrl(
                movieHref({ id: movie.movieId, title: movie.movieTitle })
              )}`
          )
          .join("\n\n")}`
      : "",
    streamingMovies.length
      ? `COMING TO STREAMING\nMovies arriving on subscription streaming this month\n\n${streamingMovies
          .map(
            (movie) =>
              `${movie.movieTitle}\n${availabilityLine(movie, input.sendDate)}\n${movie.provider}\n${absoluteUrl(
                movieHref({ id: movie.movieId, title: movie.movieTitle })
              )}`
          )
          .join("\n\n")}`
      : "",
  ].filter(Boolean);

  return {
    subject,
    previewText,
    text: `🍿 The PopScore Monthly Watchlist\nHere's what's coming home this month.\n\n${monthName.toUpperCase()} ${input.year}\n\n${textSections.join(
      "\n\n"
    )}\n\nDon't know what to watch?\nLet PopScore find your next movie based on what you actually like.\nFind My Movie: ${movieMatchUrl}\nRate more movies. Get better recommendations.\n\nUnsubscribe: ${input.unsubscribeUrl}`,
    html: `<!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>@media only screen and (max-width:520px){.movie-card{display:block!important;padding-left:0!important;padding-right:0!important;width:100%!important}}</style>
        </head>
        <body style="background:#020617;margin:0;padding:0">
          <span style="display:none!important;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(previewText)}</span>
          <div style="background:#020617;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;margin:0 auto;max-width:680px;padding:28px 12px">
            <div style="padding:8px 18px 25px;text-align:center">
              <img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="PopScore" style="border:0;border-radius:16px;display:inline-block;height:56px;object-fit:contain;width:56px" />
              <h1 style="color:#facc15;font-size:28px;line-height:1.15;margin:14px 0 8px">🍿 The PopScore Monthly Watchlist</h1>
              <p style="color:#cbd5e1;font-size:16px;line-height:1.5;margin:0">Here's what's coming home this month.</p>
              <p style="color:#f8fafc;font-size:20px;font-weight:900;letter-spacing:.12em;margin:18px 0 0">${monthName.toUpperCase()} ${input.year}</p>
            </div>
            <div style="background:#071022;border:1px solid rgba(250,204,21,.35);border-radius:24px;overflow:hidden">
              ${movieSection({
                heading: "🎬 Coming to Digital",
                movies: digitalMovies,
                sendDate: input.sendDate,
                subtitle: "Movies arriving to Rent or Buy this month",
              })}
              ${movieSection({
                heading: "📺 Coming to Streaming",
                movies: streamingMovies,
                sendDate: input.sendDate,
                subtitle: "Movies arriving on subscription streaming this month",
              })}
              <div style="background:#111827;border-top:1px solid #263249;padding:30px 22px;text-align:center">
                <h2 style="color:#f8fafc;font-size:24px;line-height:1.2;margin:0 0 10px">Don't know what to watch?</h2>
                <p style="color:#cbd5e1;font-size:15px;line-height:1.55;margin:0 auto 20px;max-width:480px">Let PopScore find your next movie based on what you actually like.</p>
                <a href="${escapeHtml(movieMatchUrl)}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:16px;font-weight:900;padding:15px 25px;text-decoration:none">Find My Movie</a>
                <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:18px 0 0">Rate more movies. Get better recommendations.</p>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:12px;line-height:1.55;padding:20px 12px 0;text-align:center">
              You received this because you opted into the PopScore Monthly Watchlist.<br />
              <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#facc15">Unsubscribe from monthly emails</a>
            </div>
          </div>
        </body>
      </html>`,
  };
}
