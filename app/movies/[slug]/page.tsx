import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  generateMovieMetadata,
  MovieDetailPage,
} from "@/app/movie/movie-detail-page";
import { getMovie } from "@/lib/tmdb";
import { movieHref, movieIdFromSlug } from "@/lib/urls";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const id = movieIdFromSlug(slug);

  if (!id) {
    return {
      title: "Movie",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return generateMovieMetadata(id);
}

export default async function SeoMoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { slug } = await params;
  const id = movieIdFromSlug(slug);

  if (!id) {
    notFound();
  }

  const movie = await getMovie(id);
  const canonicalPath = movie ? movieHref(movie) : null;

  if (canonicalPath && canonicalPath !== `/movies/${slug}`) {
    permanentRedirect(canonicalPath);
  }

  return <MovieDetailPage id={id} searchParams={searchParams} />;
}
