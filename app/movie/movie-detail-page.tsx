import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import BrandHomeLink from "@/app/components/brand-home-link";
import CoStarReactions from "@/app/components/co-star-reactions";
import EmojiIcon from "@/app/components/emoji-icon";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import ProfileMenu from "@/app/components/profile-menu";
import ProfileUsernameLink from "@/app/components/profile-username-link";
import { MovieRatingSharePanel } from "@/app/components/share-rating-button";
import TrailerModalButton from "@/app/components/trailer-modal-button";
import {
  getMovieAggregateRatingForSeo,
  getMovieFanReviews,
} from "@/lib/fan-reviews-store";
import { getPublicCommunityDiscussionsForMovie } from "@/lib/community-discussions-public";
import { SITE_KEYWORDS } from "@/lib/site-metadata";
import { absoluteUrl, truncateDescription } from "@/lib/site-url";
import {
  backdropUrl,
  formatReleaseMonthYear,
  getRecommendationMovies,
  getMovie,
  getMovieWatchProviders,
  isTmdbConfigured,
  type MovieWatchProviders,
  movieFilterGenreNames,
  posterUrl,
} from "@/lib/tmdb";
import {
  movieLocalePartsFromTag,
  movieRegionLabel,
  normalizeMovieRegion,
} from "@/lib/movie-locale";
import { discussionHref, genreHref, movieHref } from "@/lib/urls";

export const revalidate = 3600;

type MovieDetails = NonNullable<Awaited<ReturnType<typeof getMovie>>>;
type MovieDetailSearchParams = {
  preferredRegion?: string;
  region?: string;
  returnTo?: string;
  trailer?: string;
};
type RequestHeaderList = {
  get(name: string): string | null;
};

const MOVIE_WATCH_REGION_HEADER_NAMES = [
  "x-vercel-ip-country",
  "x-country-code",
  "cf-ipcountry",
  "cloudfront-viewer-country",
] as const;

function getSafeReturnPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

function firstAcceptLanguageRegion(acceptLanguage: string) {
  for (const languagePart of acceptLanguage.split(",")) {
    const locale = languagePart.split(";")[0]?.trim();
    const region = movieLocalePartsFromTag(locale).region;

    if (region) {
      return region;
    }
  }

  return "";
}

function getMovieWatchRegion(
  queryParams: MovieDetailSearchParams,
  requestHeaders: RequestHeaderList
) {
  const requestedRegion = normalizeMovieRegion(
    queryParams.region ?? queryParams.preferredRegion
  );

  if (requestedRegion) {
    return requestedRegion;
  }

  for (const headerName of MOVIE_WATCH_REGION_HEADER_NAMES) {
    const headerRegion = normalizeMovieRegion(requestHeaders.get(headerName));

    if (headerRegion && headerRegion !== "XX") {
      return headerRegion;
    }
  }

  return (
    firstAcceptLanguageRegion(requestHeaders.get("accept-language") ?? "") ||
    "US"
  );
}

function getTrailer(movie: NonNullable<Awaited<ReturnType<typeof getMovie>>>) {
  const videos = movie.videos?.results ?? [];
  const youtubeVideos = videos.filter((video) => video.site === "YouTube");
  const trailer =
    youtubeVideos.find(
      (video) => video.official && video.type === "Trailer"
    ) ??
    youtubeVideos.find((video) => video.type === "Trailer") ??
    youtubeVideos.find((video) => video.type === "Teaser") ??
    youtubeVideos[0];

  return trailer ?? null;
}

function movieDescription(movie: MovieDetails) {
  return truncateDescription(
    `See ratings, reviews, comments, and the PopScore for ${movieTitle(
      movie
    )}. Rate the movie and share your thoughts.`
  );
}

function movieTitle(movie: MovieDetails) {
  const releaseYear = movie.release_date?.slice(0, 4);

  return releaseYear ? `${movie.title} (${releaseYear})` : movie.title;
}

function movieCanonical(movie: MovieDetails) {
  return absoluteUrl(movieHref(movie));
}

export async function generateMovieMetadata(id: string): Promise<Metadata> {
  const movie = await getMovie(id);

  if (!movie) {
    return {
      title: "Movie",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${movieTitle(movie)} PopScore Rating, Reviews, and Fan Reactions`;
  const description = movieDescription(movie);
  const image = posterUrl(movie.poster_path) ?? backdropUrl(movie.backdrop_path);
  const canonical = movieCanonical(movie);

  return {
    title,
    description,
    keywords: [
      `${movie.title} reviews`,
      `${movie.title} ratings`,
      `${movie.title} PopScore`,
      "movie reviews and ratings",
      "rate movies online",
      ...SITE_KEYWORDS,
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "video.movie",
      url: canonical,
      images: image
        ? [
            {
              url: image,
              alt: `${movie.title} movie poster`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function movieJsonLd({
  aggregateRating,
  canonical,
  fanReviews,
  movie,
  poster,
}: {
  aggregateRating: Awaited<ReturnType<typeof getMovieAggregateRatingForSeo>>;
  canonical: string;
  fanReviews: Awaited<ReturnType<typeof getMovieFanReviews>>;
  movie: MovieDetails;
  poster: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    actor: movie.credits?.cast?.slice(0, 8).map((actor) => ({
      "@type": "Person",
      name: actor.name,
    })),
    aggregateRating: aggregateRating
      ? {
          "@type": "AggregateRating",
          bestRating: 100,
          ratingCount: aggregateRating.count,
          ratingValue: aggregateRating.score,
          worstRating: 0,
        }
      : undefined,
    datePublished: movie.release_date || undefined,
    description: movieDescription(movie),
    director: movie.credits?.crew
      ?.filter((crewMember) => crewMember.job === "Director")
      .map((director) => ({
        "@type": "Person",
        name: director.name,
      })),
    genre: movie.genres.map((genre) => genre.name),
    image: poster ?? undefined,
    name: movie.title,
    review: fanReviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.username,
      },
      datePublished: review.createdAt,
      itemReviewed: {
        "@type": "Movie",
        name: movie.title,
      },
      reviewBody: review.reviewComment,
      reviewRating: {
        "@type": "Rating",
        bestRating: 100,
        ratingValue: review.popscore,
        worstRating: 0,
      },
    })),
    url: canonical,
  };
}

function formatFanReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function WhereToWatchSection({
  watchProviders,
}: {
  watchProviders: MovieWatchProviders;
}) {
  return (
    <section className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div>
        <h2 className="text-lg font-black text-white">Where to Watch</h2>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
          {movieRegionLabel(watchProviders.region)}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {watchProviders.groups.map((group) => (
          <div key={group.availability}>
            <h3 className="text-sm font-black text-gray-200">{group.label}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.providers.map((provider) => {
                const logo = posterUrl(provider.logoPath, "w92");

                return (
                  <div
                    key={`${group.availability}-${provider.providerId}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2"
                  >
                    {logo ? (
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
                        <Image
                          src={logo}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </span>
                    ) : null}
                    <span className="min-w-0 break-words text-sm font-bold text-gray-100">
                      {provider.providerName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function MovieDetailPage({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<MovieDetailSearchParams>;
}) {
  const [queryParams, requestHeaders, movie] = await Promise.all([
    searchParams,
    headers(),
    getMovie(id),
  ]);

  if (!movie && isTmdbConfigured()) {
    notFound();
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
        <section className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-14">
            <BrandHomeLink />
            <ProfileMenu />
          </div>
          <div className="mt-8 rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-5 text-yellow-100">
            Add `TMDB_API_TOKEN` to your environment to load movie details.
          </div>
        </section>
      </main>
    );
  }

  const backdrop = backdropUrl(movie.backdrop_path);
  const poster = posterUrl(movie.poster_path) ?? backdrop;
  const filterGenreNames = movieFilterGenreNames(movie);
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
  const moviePath = movieHref(movie);
  const rateHref = `/rate?movie=${movie.id}&returnTo=${encodeURIComponent(
    closeHref
  )}`;
  const trailer = getTrailer(movie);
  const watchRegion = getMovieWatchRegion(queryParams, requestHeaders);
  const [
    fanReviews,
    aggregateRating,
    similarMovies,
    watchProviders,
    relatedDiscussions,
  ] =
    await Promise.all([
      getMovieFanReviews(String(movie.id)),
      getMovieAggregateRatingForSeo(String(movie.id)),
      getRecommendationMovies(String(movie.genres[0]?.id ?? ""), 8).catch(
        () => []
      ),
      getMovieWatchProviders(String(movie.id), watchRegion).catch(() => null),
      getPublicCommunityDiscussionsForMovie(String(movie.id), 3),
    ]);
  const canonical = movieCanonical(movie);
  const schema = movieJsonLd({
    aggregateRating,
    canonical,
    fanReviews,
    movie,
    poster,
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
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
            <ProfileMenu />
          </div>

          <nav
            aria-label="Breadcrumb"
            className="mt-8 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-400"
          >
            <Link href="/" className="hover:text-yellow-300">
              Home
            </Link>
            <span>/</span>
            {movie.genres[0] ? (
              <>
                <Link
                  href={genreHref(movie.genres[0].name)}
                  className="hover:text-yellow-300"
                >
                  {movie.genres[0].name}
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="text-yellow-300">{movie.title}</span>
          </nav>

          <div className="mt-5 grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-900">
              {poster ? (
                <MoviePosterImage
                  src={poster}
                  alt={`${movie.title} movie poster`}
                  sizes="280px"
                  className="object-cover"
                  fallbackMovieId={String(movie.id)}
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
                  <Link
                    key={genre.id}
                    href={genreHref(genre.name)}
                    className="hover:text-yellow-300"
                  >
                    {genre.name}
                  </Link>
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
                  {trailer ? (
                    <TrailerModalButton
                      autoOpen={queryParams.trailer === "1"}
                      moviePath={moviePath}
                      movieTitle={movie.title}
                      trailerKey={trailer.key}
                      trailerTitle={trailer.name}
                    />
                  ) : null}
                  <AddToWatchlistButton
                    movie={{
                      genre: movie.genres[0]?.name,
                      genreNames: filterGenreNames,
                      movieId: String(movie.id),
                      movieTitle: movie.title,
                      posterPath: movie.poster_path,
                      releaseDate: movie.release_date,
                    }}
                  />
                </div>
                <div className="mt-3 max-w-[260px]">
                  <CoStarReactions
                    movie={{
                      genre: movie.genres[0]?.name,
                      genreNames: filterGenreNames,
                      movieId: String(movie.id),
                      movieTitle: movie.title,
                      posterPath: movie.poster_path,
                      releaseDate: movie.release_date,
                    }}
                    movieId={String(movie.id)}
                    showTotal={false}
                    variant="mini"
                  />
                </div>
                <MovieRatingSharePanel
                  communityScore={
                    aggregateRating?.count ? aggregateRating.score : null
                  }
                  movieId={String(movie.id)}
                  movieTitle={movie.title}
                  posterPath={movie.poster_path}
                  className="mt-4 max-w-xl"
                />
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

              {watchProviders ? (
                <WhereToWatchSection watchProviders={watchProviders} />
              ) : null}
            </div>
          </div>

          {fanReviews.length > 0 ? (
            <section className="mt-10 rounded-3xl border border-yellow-400/20 bg-black/55 p-5 shadow-2xl shadow-yellow-400/10 backdrop-blur sm:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300">
                    Community
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    Fan Reviews
                  </h2>
                </div>
                <p className="text-sm font-bold text-gray-400">
                  Clean, spoiler-free thoughts from PopScore raters.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {fanReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 text-2xl shadow-lg shadow-yellow-400/10">
                        <EmojiIcon emoji={review.avatar} size={28} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-black text-white">
                              <ProfileUsernameLink username={review.username}>
                                @{review.username}
                              </ProfileUsernameLink>
                            </h3>
                            <p className="text-xs font-bold text-gray-500">
                              {formatFanReviewDate(review.createdAt)}
                            </p>
                          </div>
                          <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-right">
                            <p className="text-sm font-black text-yellow-300">
                              {review.popscore}%
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-yellow-100">
                              {review.ratingLabel}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-semibold leading-6 text-gray-200 sm:text-base">
                          {review.reviewComment}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {similarMovies.length > 0 || relatedDiscussions.length > 0 ? (
            <section className="mt-10 grid gap-5 lg:grid-cols-2">
              {similarMovies.length > 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-2xl font-black text-white">
                    Similar Movies
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {similarMovies
                      .filter((similarMovie) => similarMovie.id !== movie.id)
                      .slice(0, 4)
                      .map((similarMovie) => (
                        <Link
                          key={similarMovie.id}
                          href={movieHref(similarMovie)}
                          className="rounded-2xl border border-slate-800 bg-black/30 p-4 font-bold text-gray-200 transition hover:border-yellow-400/50 hover:text-yellow-300"
                        >
                          {similarMovie.title}
                        </Link>
                      ))}
                  </div>
                </div>
              ) : null}

              {relatedDiscussions.length > 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h2 className="text-2xl font-black text-white">
                    Related Discussions
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {relatedDiscussions.map((discussion) => (
                      <Link
                        key={discussion.id}
                        href={discussionHref(discussion)}
                        className="rounded-2xl border border-slate-800 bg-black/30 p-4 transition hover:border-yellow-400/50"
                      >
                        <span className="block font-black text-yellow-300">
                          {discussion.title}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-gray-400">
                          {discussion.commentCount} comments about{" "}
                          {discussion.movieTitle}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
