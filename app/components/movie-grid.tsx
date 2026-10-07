import Link from "next/link";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import PopScoreDisplay from "@/app/components/popscore-display";
import { backdropUrl, posterUrl, formatReleaseMonthYear, MOVIE_GENRE_FILTERS, type MovieSummary } from "@/lib/tmdb";
import { movieHref as seoMovieHref } from "@/lib/urls";
const labels = new Map(MOVIE_GENRE_FILTERS.map(genre => [Number(genre.id), genre.name]));
function genreLabelsForMovie(movie: MovieSummary) { return movie.genre_ids?.map(id => labels.get(id)).filter((name): name is string => Boolean(name)).slice(0,3) ?? []; }
function movieArtworkUrl(movie: MovieSummary) { return posterUrl(movie.poster_path) ?? backdropUrl(movie.backdrop_path, "w500"); }
export default function MovieGrid({ movies, returnTo = "", detailsReturnTo = returnTo }: { movies: MovieSummary[]; returnTo?: string; detailsReturnTo?: string }) {
return <>
              {movies.map((movie) => {
                const poster = movieArtworkUrl(movie);
                const releaseDate = movie.release_date
                  ? formatReleaseMonthYear(movie.release_date)
                  : "";
                const genreLabels = genreLabelsForMovie(movie);
                const detailsHref = detailsReturnTo ? `${seoMovieHref(movie)}?returnTo=${encodeURIComponent(detailsReturnTo)}` : seoMovieHref(movie);
                const rateHref = `/rate?movie=${
                  movie.id
                }&returnTo=${encodeURIComponent(returnTo || "/")}&from=home`;

                return (
                  <article
                    key={movie.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/85 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:rounded-[1.5rem]"
                  >
                    <div className="relative">
                      <Link data-remember-scroll href={detailsHref} className="block">
                        <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
                          <MoviePosterImage
                            src={poster}
                            alt={`${movie.title} movie poster`}
                            sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 50vw"
                            className="object-contain"
                            fallbackMovieId={String(movie.id)}
                          />
                          <div className="absolute left-2 top-2 sm:left-4 sm:top-4">
                            <PopScoreDisplay
                              movieId={String(movie.id)}
                              variant="posterBadge"
                              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/75 text-center text-[15px] font-black text-white shadow-lg shadow-yellow-400/20 sm:h-14 sm:w-14 sm:text-xl lg:h-11 lg:w-11 lg:text-base"
                            />
                          </div>
                        </div>
                      </Link>
                      <AddToWatchlistButton
                        movie={{
                          genre: genreLabels[0],
                          genreNames: genreLabels,
                          movieId: String(movie.id),
                          movieTitle: movie.title,
                          posterPath: movie.poster_path,
                          releaseDate: movie.release_date,
                        }}
                        variant="poster"
                      />
                    </div>

                    <div className="flex flex-1 flex-col space-y-2 p-3 sm:space-y-2.5 sm:p-4 lg:p-3">
                      <p className="text-xs font-bold text-slate-300 sm:text-sm lg:text-xs">
                        {releaseDate || "TBA"}
                      </p>
                      <div className="grid gap-2 sm:gap-3">
                        <Link
                          data-remember-scroll
                          href={rateHref}
                          className="rounded-xl border border-yellow-400/15 bg-yellow-400/10 px-2 py-1.5 transition hover:border-yellow-400/50 hover:bg-yellow-400/15"
                          aria-label={`Rate ${movie.title}`}
                        >
                          <PopScoreDisplay
                            movieId={String(movie.id)}
                            variant="card"
                            showNumericScore={false}
                            compactOnDesktop
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
</>;
}
