import Image from "next/image";
import Link from "next/link";
import BrandHomeLink from "@/app/components/brand-home-link";
import CoStarReactions from "@/app/components/co-star-reactions";
import MovieSearch from "@/app/components/movie-search";
import PopScoreDisplay from "@/app/components/popscore-display";
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

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
      <ScrollMemory />
      <section className="max-w-7xl mx-auto">
        <BrandHomeLink />

        <h1 className="mb-4 max-w-4xl text-3xl font-black sm:text-5xl">
          Discover Movies Worth Watching
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-gray-300 sm:text-xl">
          Movie rating built for true fans - because horror shouldn&apos;t be
          rated like comedy.
        </p>

        <MovieSearch genreId={activeGenre?.id} initialQuery={query} />

        <div
          aria-label="Filter movies by genre"
          className="mb-10 flex gap-2 overflow-x-auto pb-1"
        >
          <Link
            href={query ? `/?query=${encodeURIComponent(query)}` : "/"}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
              activeGenre
                ? "border-gray-700 bg-gray-950 text-gray-300 hover:border-yellow-400 hover:text-yellow-300"
                : "border-yellow-400 bg-yellow-400 text-black"
            }`}
          >
            All
          </Link>

          {MOVIE_GENRE_FILTERS.map((genre) => {
            const href = query
              ? `/?query=${encodeURIComponent(query)}&genre=${genre.id}`
              : `/?genre=${genre.id}`;

            return (
              <Link
                key={genre.id}
                href={href}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activeGenre?.id === genre.id
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-gray-700 bg-gray-950 text-gray-300 hover:border-yellow-400 hover:text-yellow-300"
                }`}
              >
                {genre.name}
              </Link>
            );
          })}
        </div>

        {hasMissingToken ? (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load live movie data.
          </div>
        ) : null}

        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">
          {query
            ? `${activeGenre ? `${activeGenre.name} ` : ""}Search Results for "${query}"`
            : activeGenre
              ? `${activeGenre.name} Movies`
              : "Trending Movies"}
        </h2>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
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

              return (
                <article
                  key={movie.id}
                  className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/25 transition hover:-translate-y-1 hover:scale-[1.01] hover:border-yellow-400/60 hover:shadow-yellow-400/10"
                >
                  <Link data-remember-scroll href={movieHref} className="block">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-t-2xl bg-slate-900">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={movie.title}
                          fill
                          sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                          No Poster
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4 sm:p-5">
                    <Link data-remember-scroll href={movieHref}>
                      <h3 className="line-clamp-2 min-h-12 text-base font-black leading-snug text-white transition group-hover:text-yellow-100">
                        {movie.title}
                      </h3>
                    </Link>

                    <p className="mt-2 text-xs font-bold text-slate-400">
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

                    <PopScoreDisplay
                      movieId={String(movie.id)}
                      variant="card"
                    />

                    <div className="my-4 border-t border-slate-800" />

                    <CoStarReactions movieId={String(movie.id)} />
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
