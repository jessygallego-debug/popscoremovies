import Image from "next/image";
import Link from "next/link";
import BrandHomeLink from "@/app/components/brand-home-link";
import PopScoreDisplay from "@/app/components/popscore-display";
import {
  getMovies,
  isTmdbConfigured,
  MOVIE_GENRE_FILTERS,
  posterUrl,
} from "@/lib/tmdb";

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
  const movies = await getMovies(query, 300, activeGenre?.id);
  const hasMissingToken = !isTmdbConfigured();

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="max-w-7xl mx-auto">
        <BrandHomeLink />

        <h1 className="mb-4 max-w-4xl text-3xl font-black sm:text-5xl">
          Discover Movies Worth Watching
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-gray-300 sm:text-xl">
          Movie rating built for true fans - because horror shouldn&apos;t be
          rated like comedy.
        </p>

        <form className="mb-6 flex flex-col gap-3 sm:flex-row" action="/">
          {activeGenre ? (
            <input type="hidden" name="genre" value={activeGenre.id} />
          ) : null}

          <input
            type="search"
            name="query"
            defaultValue={query}
            placeholder="Search for a movie..."
            className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-950 px-5 text-white outline-none focus:border-yellow-400"
          />

          <button
            type="submit"
            className="min-h-14 rounded-lg bg-yellow-400 px-6 font-bold text-black hover:bg-yellow-300"
          >
            Search
          </button>
        </form>

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
              const releaseYear = movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : null;

              return (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  className="block overflow-hidden rounded-lg bg-gray-900 transition hover:-translate-y-1"
                >
                  <div className="relative aspect-[2/3] bg-gray-800">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.title}
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                        No Poster
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 min-h-14 text-base font-bold">
                      {movie.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
                      Released: {releaseYear || "TBA"}
                    </p>

                    <PopScoreDisplay movieId={String(movie.id)} />
                    <p className="mt-1 text-xs font-bold text-gray-400">
                      Co-Star Score: Not rated yet
                    </p>
                  </div>
                </Link>
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
