import type { Metadata } from "next";
import Link from "next/link";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import CoStarReactions from "@/app/components/co-star-reactions";
import LovedItBadge from "@/app/components/loved-it-badge";
import MovieSearch from "@/app/components/movie-search";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import SiteHeader from "@/app/components/site-header";
import ScrollMemory from "@/app/components/scroll-memory";
import {
  SITE_DESCRIPTION,
  SITE_ICON_ALT,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/site-metadata";
import { getSiteEngagementTotals } from "@/lib/site-stats";
import { absoluteUrl } from "@/lib/site-url";
import {
  backdropUrl,
  formatReleaseMonthYear,
  getMovies,
  isTmdbConfigured,
  MOVIE_GENRE_FILTERS,
  MovieSummary,
  posterUrl,
} from "@/lib/tmdb";
import { genreHref, movieHref as seoMovieHref } from "@/lib/urls";

const TMDB_GENRE_LABELS = new Map(
  MOVIE_GENRE_FILTERS.filter((genre) => Number.isFinite(Number(genre.id))).map(
    (genre) => [Number(genre.id), genre.name]
  )
);

const whyPopScoreCards = [
  {
    title: "Personalized Recommendations",
    description:
      "Get movie suggestions based on your ratings, favorite genres, and unique taste.",
  },
  {
    title: "Genre-Specific Ratings",
    description:
      "Action, Horror, Comedy, and Romance each use questions tailored to what matters most in that genre.",
  },
  {
    title: "Join the Community",
    description:
      "Follow movie fans, share reviews, and see what people are watching and discussing right now.",
  },
  {
    title: "Discover Hidden Gems",
    description:
      "Rate movies you love and let Discovery uncover personalized recommendations you might have otherwise missed.",
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

function hasMovieArtwork(movie: MovieSummary) {
  return Boolean(movieArtworkUrl(movie));
}

function movieArtworkUrl(movie: MovieSummary) {
  return posterUrl(movie.poster_path) ?? backdropUrl(movie.backdrop_path);
}

function HeroVisual({
  movies,
  stats,
}: {
  movies: MovieSummary[];
  stats: Awaited<ReturnType<typeof getSiteEngagementTotals>>;
}) {
  const heroMovies = movies.filter((movie) => movie.poster_path).slice(0, 3);

  return (
    <div className="relative min-h-[250px] w-full overflow-hidden rounded-[1.5rem] border border-slate-800/80 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.24),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-4 shadow-2xl shadow-black/40 sm:min-h-[340px] sm:rounded-[2rem] sm:p-6 lg:min-h-[420px] lg:max-w-[720px] lg:justify-self-end">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(59,130,246,0.16),transparent_30%)]" />
      <div className="absolute left-3 top-3 z-30 rounded-2xl border border-yellow-400/25 bg-black/55 px-2.5 py-1.5 text-xs font-black text-yellow-300 shadow-lg shadow-yellow-400/10 backdrop-blur md:left-5 md:top-5 md:px-4 md:py-2.5 md:text-sm">
        🍿 {stats.totalRatings.toLocaleString()}
      </div>
      <div className="absolute right-3 top-3 z-30 rounded-2xl border border-red-400/25 bg-black/55 px-2.5 py-1.5 text-xs font-black text-red-300 shadow-lg shadow-red-500/10 backdrop-blur md:right-5 md:top-5 md:px-4 md:py-2.5 md:text-sm">
        🔥 {stats.totalReactions.toLocaleString()}
      </div>

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="relative h-[210px] w-full max-w-[320px] sm:h-[280px] sm:max-w-[420px] lg:h-[340px] lg:max-w-[440px]">
          {heroMovies.map((movie, index) => {
            const offsets = [
              "left-[3%] top-[22%] z-10 rotate-[-8deg] scale-[0.86] md:left-[0%] md:top-[18%]",
              "left-[32%] top-[4%] z-20 rotate-[2deg] scale-100 md:left-[27%] md:top-[1%]",
              "right-[1%] top-[24%] z-10 rotate-[8deg] scale-[0.88] md:right-[0%] md:top-[20%]",
            ];

            return (
              <Link
                key={movie.id}
                data-remember-scroll
                href={seoMovieHref(movie)}
                className={`absolute block w-[42%] overflow-hidden rounded-[1.35rem] border border-white/15 bg-slate-950 shadow-2xl shadow-black/60 transition duration-500 motion-safe:animate-[popFloat_8s_ease-in-out_infinite] hover:z-30 hover:-translate-y-2 hover:rotate-0 hover:border-yellow-400/70 md:w-[48%] ${offsets[index]}`}
                style={{ animationDelay: `${index * 0.8}s` }}
              >
                <div className="relative aspect-[2/3]">
                  <MoviePosterImage
                    src={posterUrl(movie.poster_path)}
                    alt={`${movie.title} movie poster on PopScore`}
                    sizes="(min-width: 1024px) 19vw, 34vw"
                    className="object-cover"
                    fallbackMovieId={String(movie.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 hidden md:block">
                    <PopScoreDisplay
                      movieId={String(movie.id)}
                      variant="posterBadge"
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/75 text-center text-lg font-black text-white shadow-lg shadow-yellow-400/20"
                    />
                  </div>
                </div>
              </Link>
            );
          })}

          <div className="absolute bottom-2 left-1/2 z-30 w-[86%] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/50 p-2 text-center shadow-2xl shadow-black/50 backdrop-blur md:w-[82%] md:p-3">
            <p className="text-[11px] font-bold leading-4 text-slate-200 md:text-sm md:leading-5">
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
      className="rounded-[1.25rem] border border-slate-800/80 bg-slate-950/65 p-3 text-center shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-5 xl:text-left"
    >
      <div className="grid gap-3 sm:gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
        <div className="flex flex-col items-center justify-center xl:items-start">
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl xl:text-3xl">
            Find Movies You&apos;ll Actually Love
          </h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-5 text-slate-300 sm:mt-3 sm:text-base sm:leading-6 xl:max-w-none">
            Discover better recommendations, connect with movie fans, and
            uncover hidden gems based on your personal taste.
          </p>
        </div>
        <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
          {whyPopScoreCards.map((card) => (
            <article
              key={card.title}
              className="flex h-full min-h-[96px] rounded-2xl border border-slate-800/80 bg-white/[0.03] p-3 transition hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-yellow-400/[0.06] sm:min-h-[128px] sm:p-4"
            >
              <div className="flex h-full flex-col">
                <div>
                  <h3 className="flex min-h-[2.1rem] items-start justify-center text-[13px] font-black leading-snug text-yellow-300 sm:min-h-[2.75rem] sm:text-base xl:justify-start">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-300 sm:text-xs sm:leading-5">
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; query?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const activeGenre = MOVIE_GENRE_FILTERS.find(
    (genre) => genre.id === params.genre
  );
  const pageTitle = activeGenre
    ? `${activeGenre.name} Movies: Fan Ratings & PopScore Reviews`
    : "PopScore | Rate Movies and Discover What to Watch Next";
  const metadataTitle = activeGenre ? pageTitle : { absolute: pageTitle };
  const description = activeGenre
    ? `Browse ${activeGenre.name.toLowerCase()} movies with PopScore fan ratings, recommendations, and community reviews.`
    : SITE_DESCRIPTION;
  const canonical = activeGenre
    ? absoluteUrl(genreHref(activeGenre.name))
    : absoluteUrl("/");
  const image = {
    url: absoluteUrl(SITE_ICON_PATH),
    width: 256,
    height: 256,
    alt: SITE_ICON_ALT,
  };

  return {
    title: metadataTitle,
    description,
    keywords: activeGenre
      ? [
          `${activeGenre.name.toLowerCase()} movies`,
          `${activeGenre.name.toLowerCase()} movie recommendations`,
          `${activeGenre.name.toLowerCase()} movie ratings`,
          ...SITE_KEYWORDS,
        ]
      : SITE_KEYWORDS,
    alternates: {
      canonical,
    },
    openGraph: {
      title: pageTitle,
      description,
      images: [image],
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description,
      images: [image],
    },
  };
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
  const [movies, siteStats] = await Promise.all([
    getMovies(query, 200, activeGenre?.id),
    getSiteEngagementTotals(),
  ]);
  const displayMovies = movies.filter(hasMovieArtwork);
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
        : genreHref(genre.name),
      isActive: activeGenre?.id === genre.id,
    })),
  ];
  const sectionTitle = query
    ? `${activeGenre ? `${activeGenre.name} ` : ""}Search Results for "${query}"`
    : activeGenre
      ? `${activeGenre.name} Movies`
      : "Trending Movies";
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    image: absoluteUrl(SITE_ICON_PATH),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(SITE_ICON_PATH),
        width: 256,
        height: 256,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/")}?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_34%,#000_64%,#020617_100%)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <ScrollMemory />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(rgba(250,204,21,0.28)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(390px,0.82fr)_minmax(520px,1fr)] lg:items-center lg:gap-12 lg:py-14">
          <div className="max-w-[680px]">
            <div className="mb-4 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]">
              Ratings that actually understand genre
            </div>
            <h1 className="text-5xl font-black leading-[0.94] text-white sm:text-6xl xl:text-7xl">
              Rate Movies
              <br />
              and Discover What to{" "}
              <span className="relative inline-block text-yellow-400">
                Watch Next
                <span className="absolute -bottom-2 left-0 h-3 w-full rounded-[50%] border-b-4 border-yellow-400/75 shadow-[0_12px_24px_rgba(250,204,21,0.42)]" />
              </span>
            </h1>
            <p className="mt-6 max-w-[620px] text-base font-semibold leading-7 text-slate-300 sm:text-lg">
              PopScore helps movie fans rate movies, track their taste, and
              discover personalized movie recommendations. Build your PopFile,
              explore movies by genre, and find something you actually want to
              watch.
            </p>
            <div className="mt-8 max-w-[640px]">
              <MovieSearch genreId={activeGenre?.id} initialQuery={query} />
            </div>
          </div>

          <HeroVisual movies={displayMovies} stats={siteStats} />
        </section>

        <div className="border-t border-white/10 pt-7">
          <WhyPopScore />
        </div>

        <section id="genres" className="mt-8">
          <div
            aria-label="Filter movies by genre"
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-8"
          >
            {genreFilters.map((genre) => (
              <Link
                key={genre.id}
                href={genre.href}
                className={`inline-flex min-h-9 min-w-0 items-center justify-center rounded-full border px-2 py-1.5 text-center text-xs font-black transition duration-300 hover:-translate-y-0.5 sm:min-h-10 sm:px-3 sm:text-sm md:min-h-11 md:px-4 ${
                  genre.isActive
                    ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300 shadow-inner shadow-black/20"
                    : "border-slate-700/90 bg-slate-950/80 text-slate-300 hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-200"
                }`}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>

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

          {displayMovies.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {displayMovies.map((movie) => {
                const poster = movieArtworkUrl(movie);
                const releaseDate = movie.release_date
                  ? formatReleaseMonthYear(movie.release_date)
                  : "";
                const genreLabels = genreLabelsForMovie(movie);
                const detailsHref = seoMovieHref(movie);
                const rateHref = `/rate?movie=${
                  movie.id
                }&returnTo=${encodeURIComponent(currentPagePath)}&from=home`;

                return (
                  <article
                    key={movie.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/85 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:rounded-[1.5rem]"
                  >
                    <Link data-remember-scroll href={detailsHref} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900 sm:aspect-[16/10]">
                        <MoviePosterImage
                          src={poster}
                          alt={`${movie.title} movie poster`}
                          sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 50vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                          fallbackMovieId={String(movie.id)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute left-2 top-2 sm:left-4 sm:top-4">
                          <PopScoreDisplay
                            movieId={String(movie.id)}
                            variant="posterBadge"
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/75 text-center text-[15px] font-black text-white shadow-lg shadow-yellow-400/20 sm:h-14 sm:w-14 sm:text-xl"
                          />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                          <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-2xl">
                            {movie.title}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-300 sm:text-sm">
                            {releaseDate || "TBA"}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col space-y-3 p-3 sm:space-y-4 sm:p-4">
                      <div className="grid gap-2 sm:gap-3">
                        <Link
                          data-remember-scroll
                          href={rateHref}
                          className="rounded-2xl border border-yellow-400/15 bg-yellow-400/10 p-2 transition hover:border-yellow-400/50 hover:bg-yellow-400/15 sm:p-3"
                          aria-label={`Rate ${movie.title}`}
                        >
                          <PopScoreDisplay movieId={String(movie.id)} variant="card" />
                        </Link>
                        <LovedItBadge movieId={String(movie.id)} />
                      </div>

                      <div className="min-h-[4.25rem] md:min-h-0">
                        {genreLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {genreLabels.map((genreName) => (
                              <span
                                key={genreName}
                                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-slate-300 sm:px-3 sm:text-xs"
                              >
                                {genreName}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

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
                        className="mt-auto w-full rounded-2xl border border-slate-700 bg-slate-950 px-2 py-2.5 text-[11px] font-black text-slate-300 transition hover:border-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300 sm:px-3 sm:py-3 sm:text-xs"
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
