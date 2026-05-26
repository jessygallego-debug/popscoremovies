type MovieLinkTarget = {
  id: number | string;
  title: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function movieSlug(movie: MovieLinkTarget) {
  const titleSlug = slugify(movie.title) || "movie";

  return `${titleSlug}-${movie.id}`;
}

export function movieHref(movie: MovieLinkTarget) {
  return `/movies/${movieSlug(movie)}`;
}

export function movieHrefById(id: string | number) {
  return `/movie/${id}`;
}

export function movieIdFromSlug(slug: string) {
  const [, id] = slug.match(/-(\d+)$/) ?? [];

  return id ?? null;
}

export function genreSlug(genreName: string) {
  return slugify(genreName);
}

export function genreHref(genreName: string) {
  return `/genre/${genreSlug(genreName)}`;
}

export function discussionSlug(discussion: { id: string; title: string }) {
  const titleSlug = slugify(discussion.title) || "discussion";

  return `${titleSlug}--${discussion.id}`;
}

export function discussionHref(discussion: { id: string; title: string }) {
  return `/discussion/${discussionSlug(discussion)}`;
}

export function discussionIdFromSlug(slug: string) {
  const separatorIndex = slug.lastIndexOf("--");

  if (separatorIndex === -1) {
    return slug;
  }

  return slug.slice(separatorIndex + 2);
}
