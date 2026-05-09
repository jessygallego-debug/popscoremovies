import Image from "next/image";
import Link from "next/link";
import BrandHomeLink from "@/app/components/brand-home-link";
import PopScoreDisplay from "@/app/components/popscore-display";
import { getMovies, isTmdbConfigured, posterUrl } from "@/lib/tmdb";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const movies = (await getMovies(query)).slice(0, 20);
  const hasMissingToken = !isTmdbConfigured();

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="max-w-7xl mx-auto">
        <BrandHomeLink />

        <h1 className="mb-4 max-w-4xl text-4xl font-black sm:text-6xl">
          Discover Movies Worth Watching
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-gray-300 sm:text-xl">
          Movie rating built for true fans - because horror shouldn&apos;t be
          rated like comedy.
        </p>

        <form className="mb-10 flex flex-col gap-3 sm:flex-row" action="/">
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

        {hasMissingToken ? (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load live movie data.
          </div>
        ) : null}

        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">
          {query ? `Search Results for "${query}"` : "Trending Movies"}
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
