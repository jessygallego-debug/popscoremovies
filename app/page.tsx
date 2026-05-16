import Link from "next/link";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import CoStarReactions from "@/app/components/co-star-reactions";
import MovieSearch from "@/app/components/movie-search";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import SiteHeader from "@/app/components/site-header";
import ScrollMemory from "@/app/components/scroll-memory";
import {
  formatReleaseMonthYear,
  getMovies,
  isTmdbConfigured,
  MOVIE_GENRE_FILTERS,
  MovieSummary,
  posterUrl,
} from "@/lib/tmdb";

const TMDB_GENRE_LABELS = new Map(
  MOVIE_GENRE_FILTERS.filter((genre) => Number.isFinite(Number(genre.id))).map(
    (genre) => [Number(genre.id), genre.name]
  )
);

const whyPopScoreCards = [
  {
    icon: "◎",
    title: "Genre-Specific Ratings",
    description: "Horror shouldn't be rated like romance.",
  },
  {
    icon: "♡",
    title: "Real Fan Reactions",
    description: "See how real fans actually feel about movies.",
  },
  {
    icon: "◇",
    title: "Built For Movie Fans",
    description: "No critics. No agendas. Just fans.",
  },
  {
    icon: "☆",
    title: "Discover Your Next Favorite",
    description: "Recommendations based on your taste.",
  },
];

function genreLabelsForMovie(movie: MovieSummary) {
  return (
    movie.genre_ids
      ?.map((genreId) => TMDB_GENRE_LABELS.get(genreId))
      .filter((genreName): genreName is string => Boolean(genreName))
      .slice(0, 3) ?? []
  );
}

function fanCountForMovie(movie: MovieSummary) {
  return Math.max(64, Math.round((movie.popularity ?? 10) * 7));
}

function lovedPercentForMovie(movie: MovieSummary) {
  return Math.min(98, Math.max(62, Math.round((movie.vote_average ?? 7.4) * 10)));
}

function HeroVisual({ movies }: { movies: MovieSummary[] }) {
  const heroMovies = movies.filter((movie) => movie.poster_path).slice(0, 3);

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-slate-800/80 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.24),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-6 shadow-2xl shadow-black/40 lg:min-h-[470px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(59,130,246,0.16),transparent_30%)]" />
      <div className="absolute left-8 top-12 rounded-2xl border border-yellow-400/25 bg-black/45 px-4 py-3 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10">
        🍿 {fanCountForMovie(heroMovies[0] ?? movies[0] ?? { popularity: 95 } as MovieSummary).toLocaleString()}
      </div>
      <div className="absolute right-8 top-7 rounded-2xl border border-red-400/25 bg-black/45 px-4 py-3 text-sm font-black text-red-300 shadow-lg shadow-red-500/10">
        ♡ {(fanCountForMovie(heroMovies[1] ?? movies[1] ?? { popularity: 170 } as MovieSummary) / 1000).toFixed(1)}K
      </div>
      <div className="absolute bottom-12 right-5 rounded-2xl border border-yellow-400/25 bg-black/45 px-4 py-3 text-sm font-black text-yellow-200 shadow-lg shadow-yellow-400/10">
        🔥 {lovedPercentForMovie(heroMovies[2] ?? movies[2] ?? { vote_average: 8.8 } as MovieSummary)}% Loved It
      </div>

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="relative h-[300px] w-full max-w-[460px] lg:h-[380px]">
          {heroMovies.map((movie, index) => {
            const offsets = [
              "left-[3%] top-[22%] z-10 rotate-[-8deg] scale-[0.86]",
              "left-[32%] top-[4%] z-20 rotate-[2deg] scale-100",
              "right-[1%] top-[24%] z-10 rotate-[8deg] scale-[0.88]",
            ];
            const genre = genreLabelsForMovie(movie)[0] ?? "Movie";

            return (
              <Link
                key={movie.id}
                data-remember-scroll
                href={`/movie/${movie.id}`}
                className={`absolute block w-[42%] overflow-hidden rounded-[1.35rem] border border-white/15 bg-slate-950 shadow-2xl shadow-black/60 transition duration-500 motion-safe:animate-[popFloat_8s_ease-in-out_infinite] hover:z-30 hover:-translate-y-2 hover:rotate-0 hover:border-yellow-400/70 ${offsets[index]}`}
                style={{ animationDelay: `${index * 0.8}s` }}
              >
                <div className="relative aspect-[2/3]">
                  <MoviePosterImage
                    src={posterUrl(movie.poster_path)}
                    alt={movie.title}
                    sizes="(min-width: 1024px) 16vw, 34vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/75 text-lg font-black text-white shadow-lg shadow-yellow-400/20">
                        {lovedPercentForMovie(movie)}
                      </span>
                      <span className="min-w-0 text-[11px] font-black text-white">
                        {genre} Fans
                        <span className="block text-[10px] font-bold text-slate-300">
                          PopScore
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          <div className="absolute bottom-2 left-1/2 z-30 w-[82%] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/45 p-3 text-center shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex justify-center -space-x-2">
              {["J", "M", "A"].map((initial) => (
                <span
                  key={initial}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/50 bg-slate-900 text-xs font-black text-yellow-300"
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-bold text-slate-200">
              Join fans rating movies by what they{" "}
              <span className="text-yellow-300">actually love.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhyPopScore() {
  return (
    <section
      id="why-popscore"
      className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/65 p-5 shadow-2xl shadow-black/30 backdrop-blur"
    >
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
        <div className="flex items-center">
          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl xl:text-3xl">
            Why PopScore?
          </h2>
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {whyPopScoreCards.map((card) => (
            <article
              key={card.title}
              className="flex h-full min-h-[150px] rounded-2xl border border-slate-800/80 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-yellow-400/[0.06]"
            >
              <div className="flex h-full flex-col gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/35 bg-yellow-400/10 text-2xl font-black text-yellow-300">
                  {card.icon}
                </span>
                <div>
                  <h3 className="text-lg font-black leading-snug text-yellow-300">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                    {card.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const activeGenre = MOVIE_GENRE_FILTERS.find(
    (genre) => genre.id === params.genre
  );
  const movies = await getMovies(query, 200, activeGenre?.id);
  const hasMissingToken = !isTmdbConfigured();
  const currentPageParams = new URLSearchParams();

  if (query) {
    currentPageParams.set("query", query);
  }

  if (activeGenre) {
    currentPageParams.set("genre", activeGenre.id);
  }

  const currentPagePath = currentPageParams.toString()
    ? `/?${currentPageParams.toString()}`
    : "/";
  const genreFilters = [
    {
      id: "all",
      name: "All",
      href: query ? `/?query=${encodeURIComponent(query)}` : "/",
      isActive: !activeGenre,
    },
    ...MOVIE_GENRE_FILTERS.map((genre) => ({
      id: genre.id,
      name: genre.name,
      href: query
        ? `/?query=${encodeURIComponent(query)}&genre=${genre.id}`
        : `/?genre=${genre.id}`,
      isActive: activeGenre?.id === genre.id,
    })),
  ];
  const sectionTitle = query
    ? `${activeGenre ? `${activeGenre.name} ` : ""}Search Results for "${query}"`
    : activeGenre
      ? `${activeGenre.name} Movies`
      : "Trending Movies";

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_34%,#000_64%,#020617_100%)] text-white">
      <ScrollMemory />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(rgba(250,204,21,0.28)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(390px,0.82fr)_minmax(520px,1fr)] lg:items-center lg:gap-12 lg:py-14">
          <div className="max-w-[680px]">
            <div className="mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Ratings that actually understand genre
            </div>
            <h1 className="text-5xl font-black leading-[0.94] text-white sm:text-6xl xl:text-7xl">
              Discover Movies
              <br />
              Worth{" "}
              <span className="relative inline-block text-yellow-400">
                Watching
                <span className="absolute -bottom-2 left-0 h-3 w-full rounded-[50%] border-b-4 border-yellow-400/75 shadow-[0_12px_24px_rgba(250,204,21,0.42)]" />
              </span>
            </h1>
            <div className="mt-8 max-w-[640px]">
              <MovieSearch genreId={activeGenre?.id} initialQuery={query} />
            </div>
          </div>

          <HeroVisual movies={movies} />
        </section>

        <section id="genres" className="border-t border-white/10 pt-7">
          <div
            aria-label="Filter movies by genre"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"
          >
            {genreFilters.map((genre) => (
              <Link
                key={genre.id}
                href={genre.href}
                className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border px-4 py-2 text-center text-sm font-black transition duration-300 hover:-translate-y-0.5 ${
                  genre.isActive
                    ? "border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-400/25"
                    : "border-slate-700/90 bg-slate-950/80 text-slate-300 hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-200"
                }`}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <WhyPopScore />
        </div>

        {hasMissingToken ? (
          <div className="mt-8 rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load live movie data.
          </div>
        ) : null}

        <section id="trending" className="mt-10">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              {sectionTitle}
            </h2>
          </div>

          {movies.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {movies.map((movie) => {
                const poster = posterUrl(movie.poster_path);
                const releaseDate = movie.release_date
                  ? formatReleaseMonthYear(movie.release_date)
                  : "";
                const genreLabels = genreLabelsForMovie(movie);
                const primaryGenre = genreLabels[0] ?? "Movie";
                const movieHref = `/movie/${
                  movie.id
                }?returnTo=${encodeURIComponent(currentPagePath)}`;
                const rateHref = `/rate?movie=${
                  movie.id
                }&returnTo=${encodeURIComponent(currentPagePath)}&from=home`;

                return (
                  <article
                    key={movie.id}
                    className="group overflow-hidden rounded-[1.5rem] border border-slate-800/90 bg-slate-950/85 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10"
                  >
                    <Link data-remember-scroll href={movieHref} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                        <MoviePosterImage
                          src={poster}
                          alt={movie.title}
                          sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute left-4 top-4 flex items-center gap-3">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/70 text-xl font-black text-white shadow-lg shadow-yellow-400/20">
                            {lovedPercentForMovie(movie)}
                          </span>
                          <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-black text-white backdrop-blur">
                            {primaryGenre} Fans
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white">
                            {movie.title}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-slate-300">
                            {releaseDate || "TBA"} · {fanCountForMovie(movie).toLocaleString()} fan reactions
                          </p>
                        </div>
                      </div>
                    </Link>

                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <Link
                          data-remember-scroll
                          href={rateHref}
                          className="rounded-2xl border border-yellow-400/15 bg-yellow-400/10 p-3 transition hover:border-yellow-400/50 hover:bg-yellow-400/15"
                          aria-label={`Rate ${movie.title}`}
                        >
                          <PopScoreDisplay movieId={String(movie.id)} variant="card" />
                        </Link>
                        <div className="rounded-2xl border border-slate-800 bg-black/25 px-3 py-2 text-sm font-black text-yellow-300">
                          🔥 {lovedPercentForMovie(movie)}% Loved It
                        </div>
                      </div>

                      {genreLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {genreLabels.map((genreName) => (
                            <span
                              key={genreName}
                              className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs font-bold text-slate-300"
                            >
                              {genreName}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <CoStarReactions
                        variant="compact"
                        movie={{
                          genre: genreLabels[0],
                          genreNames: genreLabels,
                          movieId: String(movie.id),
                          movieTitle: movie.title,
                          posterPath: movie.poster_path,
                          releaseDate: movie.release_date,
                        }}
                        movieId={String(movie.id)}
                      />

                      <AddToWatchlistButton
                        movie={{
                          genre: genreLabels[0],
                          genreNames: genreLabels,
                          movieId: String(movie.id),
                          movieTitle: movie.title,
                          posterPath: movie.poster_path,
                          releaseDate: movie.release_date,
                        }}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-black text-slate-300 transition hover:border-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-8 text-slate-300">
              {query
                ? `No movies found for "${query}".`
                : "No movies are available right now."}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
