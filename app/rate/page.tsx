import { getMovie } from "@/lib/tmdb";
import RateClient, { GenreKey } from "./rate-client";

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
  const hasActionGenre =
    genres.has("Action") ||
    genres.has("Adventure") ||
    genres.has("Thriller") ||
    genres.has("War") ||
    genres.has("Western");

  if (genres.has("Animation")) return "animated";
  if (genres.has("Documentary")) return "documentary";
  if (genres.has("Family")) return "family";
  if (genres.has("Music")) return "musical";
  if (genres.has("Romance") && genres.has("Comedy")) return "romcom";

  if (genres.has("Comedy") && (genres.has("Horror") || hasActionGenre)) {
    return "comedy";
  }

  if (genres.has("Comedy")) return "comedy";
  if (genres.has("Horror")) return "horror";
  if (genres.has("Science Fiction")) return "scifi";
  if (genres.has("Mystery")) return "mystery";
  if (genres.has("Thriller")) return "thriller";
  if (genres.has("War")) return "war";
  if (genres.has("Drama")) return "drama";
  if (genres.has("Adventure")) return "adventure";

  if (hasActionGenre) {
    return "action";
  }

  if (genres.has("Romance")) return "romance";

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
        params.from === "home" ? getSafeReturnPath(params.returnTo) : undefined
      }
    />
  );
}
