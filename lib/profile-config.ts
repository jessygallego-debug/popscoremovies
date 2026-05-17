export const AVATAR_OPTIONS = [
  { key: "clapper", label: "Clapper Board", icon: "🎬", unlockAt: 0 },
  { key: "popcorn", label: "Popcorn", icon: "🍿", unlockAt: 0 },
  { key: "theater_masks", label: "Theater Masks", icon: "🎭", unlockAt: 0 },
  { key: "movie_camera", label: "Movie Camera", icon: "🎥", unlockAt: 0 },
  { key: "tickets", label: "Admission Tickets", icon: "🎟️", unlockAt: 0 },
  { key: "star", label: "Star", icon: "⭐", unlockAt: 0 },
  { key: "heart_arrow", label: "Heart with Arrow", icon: "💘", unlockAt: 0 },
  { key: "rose", label: "Rose", icon: "🌹", unlockAt: 0 },
  { key: "rocket", label: "Rocket", icon: "🚀", unlockAt: 0 },
  { key: "ghost", label: "Ghost", icon: "👻", unlockAt: 0 },
  { key: "detective", label: "Detective", icon: "🕵️", unlockAt: 0 },
  { key: "crossed_swords", label: "Crossed Swords", icon: "⚔️", unlockAt: 0 },
  { key: "fire", label: "Fire", icon: "🔥", unlockAt: 10 },
  { key: "film_frames", label: "Film Frames", icon: "🎞️", unlockAt: 10 },
  { key: "explosion", label: "Explosion", icon: "💥", unlockAt: 10 },
  { key: "joker", label: "Joker", icon: "🃏", unlockAt: 10 },
  { key: "alien", label: "Alien", icon: "👽", unlockAt: 25 },
  { key: "saucer", label: "Flying Saucer", icon: "🛸", unlockAt: 25 },
  { key: "wizard", label: "Wizard", icon: "🧙", unlockAt: 25 },
  { key: "zombie", label: "Zombie", icon: "🧟", unlockAt: 25 },
  { key: "alien_monster", label: "Alien Monster", icon: "👾", unlockAt: 50 },
  { key: "dragon", label: "Dragon", icon: "🐉", unlockAt: 50 },
  { key: "skull", label: "Skull", icon: "💀", unlockAt: 50 },
  { key: "vampire", label: "Vampire", icon: "🧛", unlockAt: 50 },
  { key: "magic_wand", label: "Magic Wand", icon: "🪄", unlockAt: 50 },
  { key: "projector", label: "Film Projector", icon: "📽️", unlockAt: 100 },
  { key: "genie", label: "Man Genie", icon: "🧞‍♂️", unlockAt: 100 },
  { key: "crown", label: "Crown", icon: "👑", unlockAt: 150 },
] as const;

const LEGACY_AVATAR_KEY_MAP: Record<string, (typeof AVATAR_OPTIONS)[number]["key"]> = {
  butter: "popcorn",
  camera: "clapper",
  classic: "popcorn",
  ticket: "tickets",
};

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
  const normalizedKey = LEGACY_AVATAR_KEY_MAP[key] ?? key;

  return (
    AVATAR_OPTIONS.find((avatar) => avatar.key === normalizedKey) ??
    AVATAR_OPTIONS[0]
  );
}

export function isAvatarUnlocked(key: string, ratedMovieCount: number) {
  return ratedMovieCount >= avatarForKey(key).unlockAt;
}

export function firstUnlockedAvatarKey(ratedMovieCount: number) {
  return (
    AVATAR_OPTIONS.find((avatar) => ratedMovieCount >= avatar.unlockAt)?.key ??
    AVATAR_OPTIONS[0].key
  );
}

export function genreLabelForKey(key?: string | null) {
  return PROFILE_GENRES.find((genre) => genre.key === key)?.label ?? key ?? "";
}

export function genreTmdbIdForKey(key: string) {
  return PROFILE_GENRES.find((genre) => genre.key === key)?.tmdbId ?? "";
}
