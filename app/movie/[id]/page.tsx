import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  generateMovieMetadata,
  MovieDetailPage,
} from "@/app/movie/movie-detail-page";
import { getMovie } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return generateMovieMetadata(id);
}

export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);

  if (movie) {
    permanentRedirect(movieHref(movie));
  }

  return <MovieDetailPage id={id} searchParams={searchParams} />;
}
