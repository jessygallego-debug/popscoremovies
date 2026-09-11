import type { Metadata } from "next";
import { GENRE_RATING_CONFIGS } from "@/lib/genre-rating-config";
import { getMovieRatingGenreConsensus } from "@/lib/rating-genre-consensus";
import {
  applyRatingGenreConsensus,
  resolveAutomaticRatingGenre,
} from "@/lib/rating-genre-resolver";
import { getMovie, movieFilterGenreNames } from "@/lib/tmdb";
import RateClient, { GenreKey } from "./rate-client";

export const metadata: Metadata = {
  title: "Rate a Movie",
  robots: {
    index: false,
    follow: true,
  },
};

const popGenreKeys = Object.keys(GENRE_RATING_CONFIGS);

function isGenreKey(value: string | undefined): value is GenreKey {
  return Boolean(value && popGenreKeys.includes(value));
}

function getSafeReturnPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    genre?: string;
    movie?: string;
    returnTo?: string;
  }>;
}) {
  const params = await searchParams;
  const [movie, consensusGenre] = await Promise.all([
    params.movie ? getMovie(params.movie) : null,
    params.movie ? getMovieRatingGenreConsensus(params.movie) : null,
  ]);
  const automaticDecision = movie
    ? resolveAutomaticRatingGenre({
        genreNames: movie.genres.map((genre) => genre.name),
        keywords: [
          ...(movie.keywords?.keywords ?? []),
          ...(movie.keywords?.results ?? []),
        ].map((keyword) => keyword.name),
      })
    : null;
  const movieGenreDecision = automaticDecision
    ? applyRatingGenreConsensus(automaticDecision, consensusGenre)
    : null;
  const movieGenre = movieGenreDecision?.genre ?? null;
  const urlGenre = isGenreKey(params.genre) ? params.genre : null;
  const initialGenre = movieGenre ?? urlGenre ?? "horror";
  const shouldSubmitToReturnPath =
    params.from === "home" || params.from === "discover";
  const ratingSource = params.from === "discover" ? "movie_match" : undefined;

  return (
    <RateClient
      movieId={params.movie}
      initialGenre={initialGenre}
      lockGenre={Boolean(movieGenre || urlGenre)}
      movieGenreNames={movie ? movieFilterGenreNames(movie) : undefined}
      moviePosterPath={movie?.poster_path}
      movieReleaseDate={movie?.release_date}
      movieRuntimeMinutes={movie?.runtime}
      movieTitle={movie?.title}
      genreChoiceOptions={movieGenreDecision?.alternatives}
      ratingSource={ratingSource}
      returnTo={getSafeReturnPath(params.returnTo)}
      submitReturnTo={
        shouldSubmitToReturnPath ? getSafeReturnPath(params.returnTo) : undefined
      }
    />
  );
}
