import { getMovie } from "@/lib/tmdb";
import RateClient, { GenreKey } from "./rate-client";

const popGenreKeys = [
  "horror",
  "scifi",
  "action",
  "comedy",
  "romcom",
  "animated",
  "musical",
  "drama",
];

function isGenreKey(value: string | undefined): value is GenreKey {
  return Boolean(value && popGenreKeys.includes(value));
}

function mapMovieGenresToPopGenre(genreNames: string[]): GenreKey {
  const genres = new Set(genreNames);

  if (genres.has("Animation")) return "animated";
  if (genres.has("Music")) return "musical";
  if (genres.has("Horror")) return "horror";
  if (genres.has("Science Fiction")) return "scifi";
  if (genres.has("Romance") && genres.has("Comedy")) return "romcom";
  if (genres.has("Comedy")) return "comedy";
  if (genres.has("Drama")) return "drama";

  if (
    genres.has("Action") ||
    genres.has("Adventure") ||
    genres.has("Thriller") ||
    genres.has("War") ||
    genres.has("Western")
  ) {
    return "action";
  }

  if (genres.has("Romance")) return "romcom";

  return "action";
}

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; movie?: string }>;
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
      initialGenre={initialGenre}
      lockGenre={Boolean(movieGenre || urlGenre)}
      movieTitle={movie?.title}
    />
  );
}
