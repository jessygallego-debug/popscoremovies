import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import BrandHomeLink from "@/app/components/brand-home-link";
import PopScoreDisplay from "@/app/components/popscore-display";
import {
  backdropUrl,
  formatReleaseMonthYear,
  getMovie,
  isTmdbConfigured,
  posterUrl,
} from "@/lib/tmdb";

function getSafeReturnPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

function getTrailerUrl(movie: NonNullable<Awaited<ReturnType<typeof getMovie>>>) {
  const videos = movie.videos?.results ?? [];
  const youtubeVideos = videos.filter((video) => video.site === "YouTube");
  const trailer =
    youtubeVideos.find(
      (video) => video.official && video.type === "Trailer"
    ) ??
    youtubeVideos.find((video) => video.type === "Trailer") ??
    youtubeVideos.find((video) => video.type === "Teaser") ??
    youtubeVideos[0];

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const movie = await getMovie(id);

  if (!movie && isTmdbConfigured()) {
    notFound();
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
        <section className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-14">
            <BrandHomeLink />
            <Link
              href="/profile/edit"
              className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-8 rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load movie details.
          </div>
        </section>
      </main>
    );
  }

  const poster = posterUrl(movie.poster_path);
  const backdrop = backdropUrl(movie.backdrop_path);
  const releaseDate = movie.release_date
    ? formatReleaseMonthYear(movie.release_date)
    : "";
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const mainActors =
    movie.credits?.cast
      ?.sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((actor) => actor.name) ?? [];
  const directors = Array.from(
    new Set(
      movie.credits?.crew
        ?.filter((crewMember) => crewMember.job === "Director")
        .map((crewMember) => crewMember.name) ?? []
    )
  );
  const closeHref = getSafeReturnPath(queryParams.returnTo);
  const rateHref = `/rate?movie=${movie.id}&returnTo=${encodeURIComponent(
    closeHref
  )}`;
  const trailerUrl = getTrailerUrl(movie);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

        <div className="relative mx-auto max-w-6xl">
          <Link
            href={closeHref}
            aria-label="Close movie details"
            className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-gray-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            X
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4 pr-14">
            <BrandHomeLink />
            <Link
              href="/profile/edit"
              className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-900">
              {poster ? (
                <Image
                  src={poster}
                  alt={movie.title}
                  fill
                  priority
                  sizes="280px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No Poster
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-black sm:text-6xl">{movie.title}</h1>

              {movie.tagline ? (
                <p className="mt-4 text-xl text-gray-300">{movie.tagline}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-gray-300">
                {releaseDate ? <span>{releaseDate}</span> : null}
                {runtime ? <span>{runtime}</span> : null}
                {movie.genres.map((genre) => (
                  <span key={genre.id}>{genre.name}</span>
                ))}
              </div>

              <div className="mt-8 space-y-1">
                <PopScoreDisplay
                  movieId={String(movie.id)}
                  className="font-bold text-yellow-400"
                />
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={rateHref}
                    className="inline-flex min-h-12 items-center justify-center rounded-lg bg-yellow-400 px-6 font-bold text-black hover:bg-yellow-300"
                  >
                    Rate This Movie
                  </Link>
                  {trailerUrl ? (
                    <a
                      href={trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-yellow-400/50 bg-black/40 px-6 font-bold text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10"
                    >
                      Watch Trailer
                    </a>
                  ) : null}
                  <AddToWatchlistButton
                    movie={{
                      genre: movie.genres[0]?.name,
                      genreNames: movie.genres.map((genre) => genre.name),
                      movieId: String(movie.id),
                      movieTitle: movie.title,
                      posterPath: movie.poster_path,
                      releaseDate: movie.release_date,
                    }}
                  />
                </div>
              </div>

              <p className="mt-8 max-w-3xl text-lg leading-8 text-gray-200">
                {movie.overview || "No overview is available for this movie."}
              </p>

              {mainActors.length > 0 || directors.length > 0 ? (
                <div className="mt-8 grid gap-5 text-gray-200 sm:grid-cols-2">
                  {mainActors.length > 0 ? (
                    <div>
                      <h2 className="text-sm font-bold uppercase text-yellow-400">
                        Actors
                      </h2>
                      <p className="mt-2 leading-7">{mainActors.join(", ")}</p>
                    </div>
                  ) : null}

                  {directors.length > 0 ? (
                    <div>
                      <h2 className="text-sm font-bold uppercase text-yellow-400">
                        Director
                      </h2>
                      <p className="mt-2 leading-7">{directors.join(", ")}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
