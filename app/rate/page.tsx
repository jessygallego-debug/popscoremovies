import type { Metadata } from "next";
import { getMovie } from "@/lib/tmdb";
import RateClient, { GenreKey } from "./rate-client";

export const metadata: Metadata = {
  title: "Rate a Movie",
  robots: {
    index: false,
    follow: true,
  },
};

const popGenreKeys = [
  "horror",
  "scifi",
  "action",
  "adventure",
  "comedy",
  "romcom",
  "romance",
  "animated",
  "musical",
  "drama",
  "mystery",
  "family",
  "documentary",
  "war",
  "thriller",
];

function isGenreKey(value: string | undefined): value is GenreKey {
  return Boolean(value && popGenreKeys.includes(value));
}

function mapMovieGenresToPopGenre(genreNames: string[]): GenreKey {
  const genres = new Set(genreNames);

  if (genres.has("Animation")) return "animated";
  if (genres.has("Romance") && genres.has("Comedy")) return "romcom";

  const genreMap: Record<string, GenreKey> = {
    Action: "action",
    Adventure: "adventure",
    Comedy: "comedy",
    Documentary: "documentary",
    Drama: "drama",
    Family: "family",
    Horror: "horror",
    Music: "musical",
    Mystery: "mystery",
    Romance: "romance",
    "Science Fiction": "scifi",
    Thriller: "thriller",
    War: "war",
    Western: "action",
  };

  for (const genreName of genreNames) {
    const popGenre = genreMap[genreName];

    if (popGenre) {
      return popGenre;
    }
  }

  return "action";
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
  const movie = params.movie ? await getMovie(params.movie) : null;
  const movieGenre = movie
    ? mapMovieGenresToPopGenre(movie.genres.map((genre) => genre.name))
    : null;
  const urlGenre = isGenreKey(params.genre) ? params.genre : null;
  const initialGenre = movieGenre ?? urlGenre ?? "horror";
  const shouldSubmitToReturnPath =
    params.from === "home" || params.from === "discover";

  return (
    <RateClient
      movieId={params.movie}
      initialGenre={initialGenre}
      lockGenre={Boolean(movieGenre || urlGenre)}
      movieGenreNames={movie?.genres.map((genre) => genre.name)}
      moviePosterPath={movie?.poster_path}
      movieReleaseDate={movie?.release_date}
      movieTitle={movie?.title}
      returnTo={getSafeReturnPath(params.returnTo)}
      submitReturnTo={
        shouldSubmitToReturnPath ? getSafeReturnPath(params.returnTo) : undefined
      }
    />
  );
}
