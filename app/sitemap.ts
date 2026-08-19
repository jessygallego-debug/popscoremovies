import type { MetadataRoute } from "next";
import { getPublicCommunityDiscussions } from "@/lib/community-discussions-public";
import { getPublicProfileUsernames } from "@/lib/seo-data";
import { absoluteUrl } from "@/lib/site-url";
import { getMovies, MOVIE_GENRE_FILTERS } from "@/lib/tmdb";
import { discussionHref, genreHref, movieHref } from "@/lib/urls";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [movies, profiles, discussions] = await Promise.all([
    getMovies("", 160).catch(() => []),
    getPublicProfileUsernames(),
    getPublicCommunityDiscussions(200),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/discover"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/community"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/faq"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
  ];

  const genreRoutes = MOVIE_GENRE_FILTERS.map((genre) => ({
    url: absoluteUrl(genreHref(genre.name)),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const movieRoutes = movies.map((movie) => ({
    url: absoluteUrl(movieHref(movie)),
    lastModified: movie.release_date ? new Date(movie.release_date) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const discussionRoutes = discussions.map((discussion) => ({
    url: absoluteUrl(discussionHref(discussion)),
    lastModified: new Date(discussion.lastActiveAt || discussion.createdAt),
    changeFrequency: "daily" as const,
    priority: discussion.commentCount ? 0.65 : 0.55,
  }));

  const profileRoutes = profiles.map((profile) => ({
    url: absoluteUrl(`/profile/${encodeURIComponent(profile.username)}`),
    lastModified: profile.updated_at ? new Date(profile.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...genreRoutes,
    ...movieRoutes,
    ...discussionRoutes,
    ...profileRoutes,
  ];
}
