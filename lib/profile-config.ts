export const AVATAR_OPTIONS = [
  { key: "classic", label: "Classic", icon: "🍿" },
  { key: "butter", label: "Buttery", icon: "🧈" },
  { key: "fire", label: "Fire", icon: "🔥" },
  { key: "star", label: "Star", icon: "⭐" },
  { key: "ticket", label: "Ticket", icon: "🎟️" },
  { key: "camera", label: "Camera", icon: "🎬" },
];

export const PROFILE_GENRES = [
  { key: "action", label: "Action", tmdbId: "28" },
  { key: "adventure", label: "Adventure", tmdbId: "12" },
  { key: "animated", label: "Animation", tmdbId: "16" },
  { key: "comedy", label: "Comedy", tmdbId: "35" },
  { key: "documentary", label: "Documentary", tmdbId: "99" },
  { key: "drama", label: "Drama", tmdbId: "18" },
  { key: "family", label: "Family", tmdbId: "10751" },
  { key: "horror", label: "Horror", tmdbId: "27" },
  { key: "mystery", label: "Mystery", tmdbId: "9648" },
  { key: "musical", label: "Musical", tmdbId: "10402" },
  { key: "romance", label: "Romance", tmdbId: "10749" },
  { key: "romcom", label: "Rom-Com", tmdbId: "romcom" },
  { key: "scifi", label: "Sci-Fi", tmdbId: "878" },
  { key: "thriller", label: "Thriller", tmdbId: "53" },
  { key: "war", label: "War", tmdbId: "10752" },
];

export const QUICK_REACTIONS = {
  loved_it: { label: "Loved It", icon: "🔥" },
  worth_watching: { label: "Worth Watching", icon: "🍿" },
  trash: { label: "Trash", icon: "🗑️" },
} as const;

export type QuickReactionKey = keyof typeof QUICK_REACTIONS;

export function avatarForKey(key: string) {
  return AVATAR_OPTIONS.find((avatar) => avatar.key === key) ?? AVATAR_OPTIONS[0];
}

export function genreLabelForKey(key?: string | null) {
  return PROFILE_GENRES.find((genre) => genre.key === key)?.label ?? key ?? "";
}

export function genreTmdbIdForKey(key: string) {
  return PROFILE_GENRES.find((genre) => genre.key === key)?.tmdbId ?? "";
}
