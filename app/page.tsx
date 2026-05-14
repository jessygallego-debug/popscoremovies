import Image from "next/image";
import Link from "next/link";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import CoStarReactions from "@/app/components/co-star-reactions";
import MovieSearch from "@/app/components/movie-search";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import ProfileMenu from "@/app/components/profile-menu";
import ScrollMemory from "@/app/components/scroll-memory";
import {
  formatReleaseMonthYear,
  getMovies,
  isTmdbConfigured,
  MOVIE_GENRE_FILTERS,
  posterUrl,
} from "@/lib/tmdb";

const TMDB_GENRE_LABELS = new Map(
  MOVIE_GENRE_FILTERS.filter((genre) => Number.isFinite(Number(genre.id))).map(
    (genre) => [Number(genre.id), genre.name]
  )
);

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

  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#020617_0%,#000_42%,#020617_100%)] px-5 py-8 text-white sm:px-8 sm:py-12">
      <ScrollMemory />
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <Link
            href="/"
            aria-label="Go to PopScore Movies home"
            className="min-w-0 flex-1 transition hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-yellow-400/10 sm:h-14 sm:w-14"
              >
                <span className="relative block h-8 w-8 sm:h-11 sm:w-11">
                  <Image
                    src="/rating-icons/extra-buttery-v2.png"
                    alt=""
                    fill
                    sizes="(min-width: 640px) 44px, 32px"
                    className="object-contain"
                    priority
                  />
                </span>
              </span>
              <span className="text-3xl font-black tracking-wide text-yellow-400 sm:text-5xl">
                POPSCORE
              </span>
            </div>
            <span className="mt-1 pl-12 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:pl-14 sm:text-xs">
              Movie Ratings For Real Fans
            </span>
          </Link>

          <ProfileMenu />
        </div>

        <h1 className="mb-5 max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-7xl">
          Discover Movies
          <br />
          Worth{" "}
          <span className="relative inline-block text-yellow-400">
            Watching
            <span className="absolute -bottom-2 left-0 h-3 w-full rounded-[50%] border-b-4 border-yellow-400/70 shadow-[0_10px_18px_rgba(250,204,21,0.35)]" />
          </span>
        </h1>

        <p className="mb-8 max-w-2xl text-base font-semibold leading-7 text-slate-300 sm:text-xl">
          Movie rating built for true fans – because horror shouldn&apos;t be
          rated like romance.
        </p>

        <MovieSearch genreId={activeGenre?.id} initialQuery={query} />

        <div className="mb-12">
          <div
            aria-label="Filter movies by genre"
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth whitespace-nowrap py-1 md:hidden"
          >
            {genreFilters.map((genre) => (
              <Link
                key={genre.id}
                href={genre.href}
                className={`inline-flex shrink-0 snap-start items-center justify-center rounded-full border px-5 py-2.5 text-sm font-black transition ${
                  genre.isActive
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-slate-700 bg-slate-950/80 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
                }`}
              >
                {genre.name}
              </Link>
            ))}
          </div>

          <div
            aria-label="Filter movies by genre"
            className="hidden gap-3 md:grid md:grid-cols-8 md:grid-rows-2"
          >
            {genreFilters.map((genre) => (
              <Link
                key={genre.id}
                href={genre.href}
                className={`inline-flex min-w-0 items-center justify-center rounded-full border px-4 py-2.5 text-center text-sm font-black transition ${
                  genre.isActive
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-slate-700 bg-slate-950/80 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
                }`}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </div>

        {hasMissingToken ? (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load live movie data.
          </div>
        ) : null}

        <h2 className="mb-6 text-2xl font-black text-white sm:text-3xl">
          {query
            ? `${activeGenre ? `${activeGenre.name} ` : ""}Search Results for "${query}"`
            : activeGenre
              ? `${activeGenre.name} Movies`
              : "Trending Movies"}
        </h2>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => {
              const poster = posterUrl(movie.poster_path);
              const releaseDate = movie.release_date
                ? formatReleaseMonthYear(movie.release_date)
                : "";
              const genreLabels =
                movie.genre_ids
                  ?.map((genreId) => TMDB_GENRE_LABELS.get(genreId))
                  .filter((genreName): genreName is string => Boolean(genreName))
                  .slice(0, 3) ?? [];

              const movieHref = `/movie/${
                movie.id
              }?returnTo=${encodeURIComponent(currentPagePath)}`;
              const rateHref = `/rate?movie=${
                movie.id
              }&returnTo=${encodeURIComponent(currentPagePath)}&from=home`;

              return (
                <article
                  key={movie.id}
                  className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-yellow-400/60 hover:shadow-yellow-400/10"
                >
                  <Link data-remember-scroll href={movieHref} className="block">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-t-2xl bg-slate-900">
                      <MoviePosterImage
                        src={poster}
                        alt={movie.title}
                        sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  </Link>

                  <div className="p-4 sm:p-5">
                    <Link data-remember-scroll href={movieHref}>
                      <h3 className="line-clamp-2 min-h-11 text-lg font-black leading-snug text-white transition group-hover:text-yellow-100 min-[460px]:text-sm sm:min-h-12 sm:text-base">
                        {movie.title}
                      </h3>
                    </Link>

                    <p className="mt-2 text-sm font-bold text-slate-400 min-[460px]:text-xs">
                      Released: {releaseDate || "TBA"}
                    </p>

                    {genreLabels.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {genreLabels.map((genreName) => (
                          <span
                            key={genreName}
                            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300"
                          >
                            {genreName}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="my-4 border-t border-slate-800" />

                    <Link
                      data-remember-scroll
                      href={rateHref}
                      className="-m-1 block rounded-xl p-1 transition hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
                      aria-label={`Rate ${movie.title}`}
                    >
                      <PopScoreDisplay
                        movieId={String(movie.id)}
                        variant="card"
                      />
                    </Link>

                    <div className="my-4 border-t border-slate-800" />

                    <CoStarReactions
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

                    <div className="mt-4">
                      <AddToWatchlistButton
                        movie={{
                          genre: genreLabels[0],
                          genreNames: genreLabels,
                          movieId: String(movie.id),
                          movieTitle: movie.title,
                          posterPath: movie.poster_path,
                          releaseDate: movie.release_date,
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-gray-300">
            {query
              ? `No movies found for "${query}".`
              : "No movies are available right now."}
          </div>
        )}
      </section>
    </main>
  );
}
