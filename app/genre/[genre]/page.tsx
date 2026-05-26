import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import SiteHeader from "@/app/components/site-header";
import { absoluteUrl } from "@/lib/site-url";
import {
  formatReleaseMonthYear,
  getMovies,
  MOVIE_GENRE_FILTERS,
  posterUrl,
} from "@/lib/tmdb";
import { genreHref, genreSlug, movieHref, slugify } from "@/lib/urls";

export const revalidate = 3600;

function genreForParam(value: string) {
  const normalizedGenre = slugify(value);

  return MOVIE_GENRE_FILTERS.find(
    (genre) => genreSlug(genre.name) === normalizedGenre
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre: genreParam } = await params;
  const genre = genreForParam(genreParam);

  if (!genre) {
    return {
      title: "Movie Genre",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${genre.name} Movies: Reviews, Ratings & Recommendations`;
  const description = `Discover ${genre.name.toLowerCase()} movies on PopScore, with fan ratings, recommendations, discussions, and PopScore reviews.`;
  const canonical = absoluteUrl(genreHref(genre.name));

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: genreParam } = await params;
  const genre = genreForParam(genreParam);

  if (!genre) {
    notFound();
  }

  const movies = await getMovies("", 80, genre.id);

  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#020617_0%,#000_58%,#020617_100%)] text-white">
      <section className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <nav
          aria-label="Breadcrumb"
          className="mt-8 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-400"
        >
          <Link href="/" className="hover:text-yellow-300">
            Home
          </Link>
          <span>/</span>
          <span className="text-yellow-300">{genre.name} Movies</span>
        </nav>

        <header className="py-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">
            Movie Genre
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
            {genre.name} Movies
          </h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Browse {genre.name.toLowerCase()} movie recommendations, fan
            ratings, PopScore reactions, and reviews from the PopScore
            community.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-2">
          {MOVIE_GENRE_FILTERS.map((genreFilter) => (
            <Link
              key={genreFilter.id}
              href={genreHref(genreFilter.name)}
              className={`rounded-full border px-3 py-2 text-xs font-black transition sm:text-sm ${
                genreFilter.id === genre.id
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400/50 hover:text-yellow-200"
              }`}
            >
              {genreFilter.name}
            </Link>
          ))}
        </div>

        <section className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {movies.map((movie) => {
            const releaseDate = movie.release_date
              ? formatReleaseMonthYear(movie.release_date)
              : "TBA";

            return (
              <article
                key={movie.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/85 shadow-xl shadow-black/30 transition hover:-translate-y-1 hover:border-yellow-400/50"
              >
                <Link href={movieHref(movie)} className="block">
                  <div className="relative aspect-[2/3] bg-slate-900">
                    <MoviePosterImage
                      src={posterUrl(movie.poster_path)}
                      alt={movie.title}
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="object-cover"
                      fallbackMovieId={String(movie.id)}
                    />
                    <div className="absolute left-3 top-3">
                      <PopScoreDisplay
                        movieId={String(movie.id)}
                        variant="posterBadge"
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/75 text-center text-base font-black text-white shadow-lg shadow-yellow-400/20"
                      />
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <h2 className="line-clamp-2 text-lg font-black text-white">
                    <Link href={movieHref(movie)}>{movie.title}</Link>
                  </h2>
                  <p className="mt-2 text-sm font-bold text-slate-400">
                    {releaseDate}
                  </p>
                  {movie.overview ? (
                    <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-300">
                      {movie.overview}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
