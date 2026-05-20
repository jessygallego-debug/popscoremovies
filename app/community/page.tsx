"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CommunityPostComments from "@/app/components/community-post-comments";
import CommunityPostLikeButton from "@/app/components/community-post-like-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import SiteHeader from "@/app/components/site-header";
import {
  communityDiscussionHref,
  communityDiscussionsStorageKey,
  discussionFilterOptions,
  discussionTypes,
  mockCommunityDiscussions,
  parseStoredCommunityDiscussions,
  type CommunityDiscussion,
  type DiscussionFilter,
  type DiscussionType,
} from "@/lib/community-discussions";
import {
  createNotification,
  getCurrentNotificationActor,
} from "@/lib/notifications";
import {
  getRecentCommunityRatings,
  getTopReviewers,
  type CommunityRatingFeedItem,
  type TopReviewerSummary,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";

type CommunityUser = {
  avatar: string;
  displayName: string;
  userId?: string;
  username: string;
};

type PopScoreReaction = {
  accentClass: string;
  iconSrc: string;
  label: string;
};

type CommunityFeedPost = {
  actionHref?: string;
  actionLabel?: string;
  activity: string;
  comment?: string;
  commentCount: number;
  genres: string[];
  id: string;
  interactedAvatars: string[];
  extraInteractions: number;
  likeCount: number;
  movie: {
    fallbackMovieId: string;
    imagePath: string | null;
    title: string;
  };
  popscore?: number;
  reaction?: PopScoreReaction;
  replyLink?: string;
  timestamp: string;
  user: CommunityUser;
};

type SuggestedFollow = CommunityUser & {
  favoriteGenre: string;
  userId: string;
};

type MovieSuggestion = {
  genreNames?: string[];
  id: number;
  posterPath?: string | null;
  releaseDate: string;
  title: string;
};

const feedTabs = ["Feed", "Following", "Discussions"] as const;

type CommunityTab = (typeof feedTabs)[number];

const genreFilters = [
  "All Genres",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Rom-Com",
  "Sci-Fi",
  "Thriller",
  "War",
];

const trendFilters = ["Trending", "Newest", "Most Liked", "Most Commented"];

const feedPosts: CommunityFeedPost[] = [
  {
    id: "interstellar-rating",
    user: {
      avatar: "🔥",
      displayName: "Jessy",
      userId: "user-jessy",
      username: "jessy",
    },
    activity: "rated Interstellar",
    timestamp: "2h ago",
    movie: {
      title: "Interstellar",
      fallbackMovieId: "157336",
      imagePath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    popscore: 94,
    reaction: reactionForScore(94),
    comment:
      "A masterpiece. The visuals, the story, the emotions... everything about this movie hits differently.",
    genres: ["Adventure", "Drama", "Sci-Fi"],
    likeCount: 24,
    commentCount: 7,
    interactedAvatars: ["🎬", "🌹", "⭐", "🚀"],
    extraInteractions: 18,
  },
  {
    id: "sinners-worth-watching",
    user: {
      avatar: "🎬",
      displayName: "Mike",
      userId: "user-moviemike",
      username: "moviemike",
    },
    activity: "marked Sinners as Worth Watching",
    timestamp: "5h ago",
    movie: {
      title: "Sinners",
      fallbackMovieId: "1233413",
      imagePath: null,
    },
    popscore: 78,
    reaction: reactionForScore(78),
    comment:
      "Great music, strong performances and a fresh take on the genre. Third act was wild!",
    genres: ["Drama", "Horror", "Thriller"],
    likeCount: 16,
    commentCount: 3,
    interactedAvatars: ["🔥", "🎥", "👻", "🎟️"],
    extraInteractions: 12,
  },
  {
    id: "dark-knight-comment",
    user: {
      avatar: "🌹",
      displayName: "Sarah",
      userId: "user-sarahscreens",
      username: "sarahscreens",
    },
    activity: "commented on The Dark Knight",
    timestamp: "1d ago",
    movie: {
      title: "The Dark Knight",
      fallbackMovieId: "155",
      imagePath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    },
    comment:
      "Heath Ledger delivered something the world has never seen before. Still gives me chills.",
    genres: ["Action", "Crime", "Drama", "Thriller"],
    likeCount: 21,
    commentCount: 4,
    replyLink: "View 4 replies",
    interactedAvatars: [],
    extraInteractions: 0,
  },
  {
    id: "prestige-discovery",
    user: {
      avatar: "🚀",
      displayName: "Chris",
      userId: "user-cinephilechris",
      username: "cinephilechris",
    },
    activity: "discovered The Prestige",
    timestamp: "1d ago",
    movie: {
      title: "The Prestige",
      fallbackMovieId: "1124",
      imagePath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
    },
    comment: "Discovered this gem through PopScore Discovery ✨",
    genres: ["Drama", "Mystery", "Thriller"],
    likeCount: 18,
    commentCount: 2,
    interactedAvatars: ["🔥", "🎬", "🎥", "👻"],
    extraInteractions: 7,
  },
  {
    id: "dune-rating",
    user: {
      avatar: "👻",
      displayName: "Lina",
      userId: "user-linarose",
      username: "linarose",
    },
    activity: "rated Dune: Part Two",
    timestamp: "2d ago",
    movie: {
      title: "Dune: Part Two",
      fallbackMovieId: "693134",
      imagePath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    },
    popscore: 90,
    reaction: reactionForScore(90),
    comment: "Absolutely stunning. Villeneuve is in a league of his own.",
    genres: ["Action", "Adventure", "Drama", "Sci-Fi"],
    likeCount: 31,
    commentCount: 5,
    interactedAvatars: ["🚀", "🎬", "🔥", "🎥"],
    extraInteractions: 22,
  },
];

const suggestedFollows: SuggestedFollow[] = [
  {
    avatar: "👻",
    displayName: "Lina Rose",
    favoriteGenre: "Horror",
    userId: "user-linarose",
    username: "linarose",
  },
  {
    avatar: "🎬",
    displayName: "MovieMike",
    favoriteGenre: "Action",
    userId: "user-moviemike",
    username: "moviemike",
  },
  {
    avatar: "🎥",
    displayName: "FilmFanatic",
    favoriteGenre: "Drama",
    userId: "user-filmfanatic",
    username: "filmfanatic",
  },
  {
    avatar: "🚀",
    displayName: "CinephileChris",
    favoriteGenre: "Sci-Fi",
    userId: "user-cinephilechris",
    username: "cinephilechris",
  },
  {
    avatar: "⭐",
    displayName: "Dreddock",
    favoriteGenre: "Thriller",
    userId: "user-dreddock",
    username: "dreddock",
  },
  {
    avatar: "🎭",
    displayName: "Reels2Rants",
    favoriteGenre: "Horror",
    userId: "user-reels2rantsdawk88",
    username: "reels2rantsdawk88",
  },
  {
    avatar: "🍿",
    displayName: "PopcornPat",
    favoriteGenre: "Comedy",
    userId: "user-popcornpat",
    username: "popcornpat",
  },
  {
    avatar: "🎟️",
    displayName: "ScreenQueen",
    favoriteGenre: "Romance",
    userId: "user-screenqueen",
    username: "screenqueen",
  },
];

function cardClass(extra = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/78 shadow-2xl shadow-black/30 backdrop-blur ${extra}`;
}

function scoreBadgeClass(score: number) {
  if (score >= 90) {
    return "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 shadow-emerald-400/10";
  }

  if (score >= 75) {
    return "border-yellow-400/40 bg-yellow-400/20 text-yellow-200 shadow-yellow-400/10";
  }

  return "border-orange-400/40 bg-orange-500/20 text-orange-200 shadow-orange-400/10";
}

function getVisibleFeedPosts(
  posts: CommunityFeedPost[],
  selectedGenre: string,
  selectedTrend: string
) {
  const matchingPosts =
    selectedGenre === "All Genres"
      ? posts
      : posts.filter((post) => post.genres.includes(selectedGenre));
  const sortedPosts = [...matchingPosts];

  if (selectedTrend === "Most Liked") {
    return sortedPosts.sort((a, b) => b.likeCount - a.likeCount);
  }

  if (selectedTrend === "Most Commented") {
    return sortedPosts.sort((a, b) => b.commentCount - a.commentCount);
  }

  if (selectedTrend === "Newest") {
    return sortedPosts;
  }

  return sortedPosts.sort(
    (a, b) =>
      b.likeCount +
      b.commentCount * 2 -
      (a.likeCount + a.commentCount * 2)
  );
}

function getVisibleDiscussions(
  discussions: CommunityDiscussion[],
  selectedFilter: DiscussionFilter,
  selectedGenre: string
) {
  const matchingDiscussions = discussions.filter((discussion) => {
    const matchesGenre =
      selectedGenre === "All Genres" ||
      discussion.movieGenres.includes(selectedGenre) ||
      discussion.tags.includes(selectedGenre);
    const matchesFilter =
      selectedFilter === "Spoiler-Free"
        ? !discussion.isSpoiler
        : true;

    return matchesGenre && matchesFilter;
  });
  const sortedDiscussions = [...matchingDiscussions];

  if (selectedFilter === "Newest") {
    return sortedDiscussions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (selectedFilter === "Most Commented") {
    return sortedDiscussions.sort((a, b) => b.commentCount - a.commentCount);
  }

  return sortedDiscussions.sort((a, b) => {
    const bActivity =
      new Date(b.lastActiveAt).getTime() / 600000 +
      b.commentCount * 4 +
      b.likeCount;
    const aActivity =
      new Date(a.lastActiveAt).getTime() / 600000 +
      a.commentCount * 4 +
      a.likeCount;

    return bActivity - aActivity;
  });
}

function releaseYear(value: string) {
  return value ? value.slice(0, 4) : "";
}

function communityMovieHref(movieId: string) {
  return `/movie/${movieId}?returnTo=${encodeURIComponent("/community")}`;
}

function communityRateHref(movieId: string) {
  return `/rate?movie=${movieId}&returnTo=${encodeURIComponent(
    "/community"
  )}&from=community`;
}

function formatRelativePostTime(value: string) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "Just now";
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  return `${Math.floor(hoursAgo / 24)}d ago`;
}

function discussionToFeedPost(discussion: CommunityDiscussion): CommunityFeedPost {
  return {
    actionHref: communityDiscussionHref(discussion.id),
    actionLabel: "Join Discussion",
    activity: `started a discussion about ${discussion.movieTitle}`,
    comment: discussion.title,
    commentCount: discussion.commentCount,
    extraInteractions: 0,
    genres: discussion.movieGenres,
    id: `discussion-${discussion.id}`,
    interactedAvatars: [],
    likeCount: discussion.likeCount,
    movie: {
      fallbackMovieId: discussion.movieId,
      imagePath: discussion.moviePosterUrl,
      title: discussion.movieTitle,
    },
    timestamp: formatRelativePostTime(discussion.createdAt),
    user: {
      avatar: discussion.startedByAvatarUrl,
      displayName: discussion.startedByDisplayName,
      userId: discussion.startedByUserId,
      username:
        discussion.startedByUsername ??
        discussion.startedByDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    },
  };
}

function reactionForScore(score: number): PopScoreReaction {
  if (score >= 90) {
    return {
      accentClass: "text-yellow-200",
      iconSrc: "/rating-icons/extra-buttery-v2.png",
      label: "Extra Buttery",
    };
  }

  if (score >= 75) {
    return {
      accentClass: "text-yellow-300",
      iconSrc: "/rating-icons/buttery.png",
      label: "Buttery",
    };
  }

  if (score >= 60) {
    return {
      accentClass: "text-yellow-100",
      iconSrc: "/rating-icons/fresh-popcorn.png",
      label: "Fresh Popcorn",
    };
  }

  if (score >= 40) {
    return {
      accentClass: "text-orange-200",
      iconSrc: "/rating-icons/salty.png",
      label: "Salty",
    };
  }

  return {
    accentClass: "text-red-200",
    iconSrc: "/rating-icons/burnt.png",
    label: "Burnt",
  };
}

function normalizeCommunityGenres(genreNames: string[], ratingGenre: string) {
  const aliases: Record<string, string> = {
    animated: "Animation",
    animation: "Animation",
    rom_com: "Rom-Com",
    romcom: "Rom-Com",
    sci_fi: "Sci-Fi",
    scifi: "Sci-Fi",
    "science fiction": "Sci-Fi",
  };
  const genres = [...genreNames, ratingGenre]
    .map((genre) => {
      const normalizedGenre = genre.toLowerCase().trim();

      return aliases[normalizedGenre] ?? genre;
    })
    .filter((genre) => genreFilters.includes(genre));

  return Array.from(new Set(genres));
}

function mapCommunityRatingToPost(
  rating: CommunityRatingFeedItem
): CommunityFeedPost {
  return {
    activity: `rated ${rating.movieTitle}`,
    comment: rating.reviewComment ?? undefined,
    commentCount: 0,
    extraInteractions: 0,
    genres: normalizeCommunityGenres(rating.genreNames, rating.genre),
    id: `rating-${rating.id}`,
    interactedAvatars: [],
    likeCount: 0,
    movie: {
      fallbackMovieId: rating.movieId,
      imagePath: rating.posterPath ?? null,
      title: rating.movieTitle,
    },
    popscore: rating.popscore,
    reaction: reactionForScore(rating.popscore),
    timestamp: formatRelativePostTime(rating.updated_at ?? rating.created_at),
    user: {
      avatar: rating.avatar,
      displayName: rating.username,
      userId: rating.user_id,
      username: rating.username,
    },
  };
}

function formatSuggestionDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function Avatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    lg: "h-12 w-12 text-2xl",
    md: "h-10 w-10 text-xl",
    sm: "h-7 w-7 text-sm",
  }[size];

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),rgba(15,23,42,0.96)_58%)] font-black text-white shadow-lg shadow-yellow-400/10`}
    >
      {label}
    </span>
  );
}

function MovieThumb({
  alt,
  fallbackMovieId,
  fit = "cover",
  href,
  imagePath,
  wide = false,
}: {
  alt: string;
  fallbackMovieId: string;
  fit?: "contain" | "cover";
  href?: string;
  imagePath: string | null;
  wide?: boolean;
}) {
  const thumb = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900 transition ${
        wide
          ? "mx-auto aspect-[2/3] w-full max-w-[112px] sm:mx-0 sm:max-w-none"
          : "aspect-[4/3]"
      } ${
        href
          ? "shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:shadow-yellow-400/10"
          : ""
      }`}
    >
      <MoviePosterImage
        alt={alt}
        className={fit === "contain" ? "object-contain" : "object-cover"}
        fallbackMovieId={fallbackMovieId}
        sizes={wide ? "(min-width: 1024px) 120px, 112px" : "96px"}
        src={posterUrl(imagePath)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );

  if (!href) {
    return thumb;
  }

  return (
    <Link href={href} aria-label={`View ${alt}`} className="block">
      {thumb}
    </Link>
  );
}

function CommunityTabs({
  onSelect,
  selectedTab,
}: {
  onSelect: (tab: CommunityTab) => void;
  selectedTab: CommunityTab;
}) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-white/10 text-sm font-black text-slate-400 sm:gap-8">
      {feedTabs.map((tab) => {
        const isSelected = tab === selectedTab;

        return (
          <button
            key={tab}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(tab)}
            className={`shrink-0 border-b-2 px-0 pb-3 transition hover:text-yellow-300 ${
              isSelected
                ? "border-yellow-400 text-yellow-300"
                : "border-transparent"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function CommunitySearch() {
  return (
    <label className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-800 bg-black/35 px-4 text-sm font-bold text-slate-400 shadow-inner shadow-black/20 sm:max-w-md">
      <span aria-hidden="true" className="text-lg">
        ⌕
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
        placeholder="Search movies, users..."
        type="search"
      />
    </label>
  );
}

function SelectMovieDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);

      fetch(
        `/api/search-suggestions?${new URLSearchParams({
          query: trimmedQuery,
        }).toString()}`,
        { signal: controller.signal }
      )
        .then((response) => response.json())
        .then((data: { suggestions?: MovieSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const selectMovie = (movieId: number) => {
    router.push(communityRateHref(String(movieId)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select a movie to rate"
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/75 px-4 py-24 backdrop-blur-sm sm:py-28"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Select Movie</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Search for a movie, then rate it.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close movie selector"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            X
          </button>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Search movies</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;

              setQuery(nextQuery);

              if (nextQuery.trim().length < 2) {
                setSuggestions([]);
                setIsSearching(false);
              }
            }}
            placeholder="Search for a movie..."
            type="search"
            className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
          />
        </label>

        <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-slate-800 bg-black/30">
          {suggestions.length > 0 ? (
            suggestions.map((movie) => {
              const releaseDate = formatSuggestionDate(movie.releaseDate);

              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => selectMovie(movie.id)}
                  className="block w-full border-b border-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition last:border-b-0 hover:bg-yellow-400 hover:text-black"
                >
                  {movie.title}
                  {releaseDate ? (
                    <span className="ml-2 font-semibold text-slate-400">
                      {releaseDate}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-5 text-sm font-bold text-slate-500">
              {query.trim().length < 2
                ? "Type at least 2 letters to search."
                : isSearching
                  ? "Searching..."
                  : "No movies found."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieSearchSelect({
  onSelect,
  selectedMovie,
}: {
  onSelect: (movie: MovieSuggestion) => void;
  selectedMovie: MovieSuggestion | null;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);

      fetch(
        `/api/search-suggestions?${new URLSearchParams({
          query: trimmedQuery,
        }).toString()}`,
        { signal: controller.signal }
      )
        .then((response) => response.json())
        .then((data: { suggestions?: MovieSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Search for a movie</span>
        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;

            setQuery(nextQuery);

            if (nextQuery.trim().length < 2) {
              setSuggestions([]);
              setIsSearching(false);
            }
          }}
          placeholder="Search for a movie..."
          type="search"
          className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
        />
      </label>

      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-black/30">
        {suggestions.length > 0 ? (
          suggestions.map((movie) => {
            const genres = movie.genreNames ?? [];

            return (
              <button
                key={movie.id}
                type="button"
                onClick={() => {
                  onSelect(movie);
                  setQuery(movie.title);
                  setSuggestions([]);
                }}
                className="grid w-full grid-cols-[54px_1fr] items-center gap-3 border-b border-slate-900 px-3 py-3 text-left transition last:border-b-0 hover:bg-yellow-400 hover:text-black"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900">
                  <MoviePosterImage
                    alt={movie.title}
                    className="object-cover"
                    fallbackMovieId={String(movie.id)}
                    sizes="54px"
                    src={posterUrl(movie.posterPath ?? null)}
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{movie.title}</p>
                  <p className="mt-1 text-xs font-bold opacity-75">
                    {[releaseYear(movie.releaseDate), genres[0]]
                      .filter(Boolean)
                      .join(" • ") || "Movie"}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-5 text-sm font-bold text-slate-500">
            {query.trim().length < 2
              ? "Type at least 2 letters to search."
              : isSearching
                ? "Searching..."
                : "No movies found."}
          </p>
        )}
      </div>

      {selectedMovie ? (
        <div className="mt-4 grid grid-cols-[76px_1fr] gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900">
            <MoviePosterImage
              alt={selectedMovie.title}
              className="object-cover"
              fallbackMovieId={String(selectedMovie.id)}
              sizes="76px"
              src={posterUrl(selectedMovie.posterPath ?? null)}
              unoptimized
            />
          </div>
          <div className="min-w-0 self-center">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-yellow-300">
              Selected Movie
            </p>
            <h3 className="mt-1 truncate text-lg font-black text-white">
              {selectedMovie.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {[releaseYear(selectedMovie.releaseDate), ...(selectedMovie.genreNames ?? [])]
                .filter(Boolean)
                .join(" • ") || "Movie"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StartDiscussionModal({
  onClose,
  onPost,
}: {
  onClose: () => void;
  onPost: (discussion: CommunityDiscussion) => void;
}) {
  const [selectedMovie, setSelectedMovie] = useState<MovieSuggestion | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discussionType, setDiscussionType] = useState<DiscussionType | "">("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const canPost = Boolean(selectedMovie && title.trim() && discussionType);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const postDiscussion = () => {
    if (!selectedMovie || !title.trim() || !discussionType) {
      return;
    }

    const now = new Date().toISOString();
    const movieGenres =
      selectedMovie.genreNames && selectedMovie.genreNames.length > 0
        ? selectedMovie.genreNames
        : ["Drama"];
    const idBase = `${selectedMovie.title}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);

    onPost({
      body: body.trim(),
      commentCount: 0,
      createdAt: now,
      id: `${idBase || "discussion"}-${Date.now()}`,
      isSpoiler,
      lastActiveAt: now,
      likeCount: 0,
      movieGenres,
      movieId: String(selectedMovie.id),
      moviePosterUrl: selectedMovie.posterPath ?? null,
      movieTitle: selectedMovie.title,
      movieYear: releaseYear(selectedMovie.releaseDate),
      startedByAvatarUrl: "🔥",
      startedByDisplayName: "Jessy",
      startedByUserId: "current-user",
      startedByUsername: "jessyg305",
      tags: movieGenres.slice(0, 2),
      title: title.trim(),
      type: discussionType,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start a Movie Discussion"
      className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10 backdrop-blur-sm sm:py-16"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">
              Start a Movie Discussion
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Pick a movie first, then add the conversation details.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close discussion form"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            X
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                Step 1
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                Select Movie
              </h3>
            </div>
            <MovieSearchSelect
              onSelect={setSelectedMovie}
              selectedMovie={selectedMovie}
            />
          </section>

          <section
            className={`rounded-2xl border p-4 transition ${
              selectedMovie
                ? "border-slate-800 bg-black/25"
                : "border-slate-800/60 bg-black/10 opacity-60"
            }`}
          >
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                Step 2
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                Add Discussion Details
              </h3>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="sr-only">Discussion title</span>
                <input
                  disabled={!selectedMovie}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What do you want to ask or discuss?"
                  className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 disabled:cursor-not-allowed"
                />
              </label>

              <textarea
                disabled={!selectedMovie}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share your thoughts to get the conversation started..."
                className="min-h-28 w-full resize-none rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 disabled:cursor-not-allowed"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Discussion Type
                  </span>
                  <select
                    disabled={!selectedMovie}
                    value={discussionType}
                    onChange={(event) =>
                      setDiscussionType(event.target.value as DiscussionType)
                    }
                    className="min-h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-white outline-none transition focus:border-yellow-400/70 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose one</option>
                    {discussionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-black text-white">
                  <input
                    checked={isSpoiler}
                    disabled={!selectedMovie}
                    onChange={(event) => setIsSpoiler(event.target.checked)}
                    type="checkbox"
                    className="h-4 w-4 accent-yellow-400"
                  />
                  This discussion contains spoilers
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canPost}
            onClick={postDiscussion}
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            Post Discussion
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePostBox({ onSelectMovie }: { onSelectMovie: () => void }) {
  return (
    <section className={cardClass("p-3 sm:p-4")}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-300 sm:text-base">
          What movie is on your mind?
        </p>
        <button
          type="button"
          onClick={onSelectMovie}
          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-5"
        >
          Select Movie
        </button>
      </div>
    </section>
  );
}

function FilterMenu({
  onSelect,
  options,
  selectedOption,
}: {
  onSelect: (option: string) => void;
  options: string[];
  selectedOption: string;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = menuRef.current;

      if (menu && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const closeOtherMenus = () => {
    const currentMenu = menuRef.current;

    if (!currentMenu?.open) {
      return;
    }

    document
      .querySelectorAll<HTMLDetailsElement>("[data-community-filter-menu]")
      .forEach((menu) => {
        if (menu !== currentMenu) {
          menu.removeAttribute("open");
        }
      });
  };

  return (
    <details
      ref={menuRef}
      data-community-filter-menu
      onToggle={closeOtherMenus}
      className="group relative z-[70]"
    >
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/90 px-4 text-sm font-black text-slate-100 shadow-inner shadow-black/20 outline-none transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-200 [&::-webkit-details-marker]:hidden">
        {selectedOption}
        <span
          aria-hidden="true"
          className="text-yellow-300 transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="absolute left-0 z-[90] mt-2 grid max-h-72 min-w-52 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/60">
        {options.map((option) => {
          const isSelected = option === selectedOption;

          return (
            <button
              key={option}
              type="button"
              onClick={(event) => {
                onSelect(option);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={`rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                isSelected
                  ? "bg-yellow-400 text-black"
                  : "text-slate-200 hover:bg-yellow-400/10 hover:text-yellow-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function CommunityFilters({
  onGenreChange,
  onTrendChange,
  selectedGenre,
  selectedTrend,
}: {
  onGenreChange: (genre: string) => void;
  onTrendChange: (trend: string) => void;
  selectedGenre: string;
  selectedTrend: string;
}) {
  return (
    <section className={cardClass("relative z-[60] overflow-visible p-3")}>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <FilterMenu
          onSelect={onGenreChange}
          options={genreFilters}
          selectedOption={selectedGenre}
        />
        <FilterMenu
          onSelect={onTrendChange}
          options={trendFilters}
          selectedOption={selectedTrend}
        />
      </div>
    </section>
  );
}

function CommunityFeedCard({ post }: { post: CommunityFeedPost }) {
  const isCommentPost = Boolean(post.replyLink);

  return (
    <article className={cardClass("p-3 sm:p-4")}>
      <div className="flex items-start gap-3">
        <Avatar label={post.user.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-200">
                <span className="font-black text-white">
                  @{post.user.username}
                </span>{" "}
                {post.activity}
                {post.popscore ? (
                  <span
                    className={`ml-2 inline-flex rounded-lg border px-2 py-1 text-sm font-black shadow-lg ${scoreBadgeClass(
                      post.popscore
                    )}`}
                  >
                    {post.popscore}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {post.timestamp}
              </p>
            </div>
            <button
              type="button"
              aria-label="More options"
              className="rounded-full px-2 text-xl font-black text-slate-500 transition hover:bg-white/10 hover:text-yellow-300"
            >
              ...
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[110px_1fr] lg:grid-cols-[120px_1fr]">
            <MovieThumb
              alt={post.movie.title}
              fallbackMovieId={post.movie.fallbackMovieId}
              href={communityMovieHref(post.movie.fallbackMovieId)}
              imagePath={post.movie.imagePath}
              wide
            />
            <div className="flex min-w-0 flex-col justify-center">
              {post.reaction ? (
                <div className="flex items-center gap-2">
                  <span className="relative block h-7 w-7 overflow-hidden rounded-full border border-yellow-400/25 bg-black/30 shadow-lg shadow-yellow-400/10">
                    <Image
                      src={post.reaction.iconSrc}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                  <p
                    className={`text-base font-black ${post.reaction.accentClass}`}
                  >
                    {post.reaction.label}
                  </p>
                </div>
              ) : null}
              {post.comment ? (
                <p
                  className={`mt-2 max-w-2xl text-sm font-semibold leading-5 text-slate-300 ${
                    isCommentPost
                      ? "rounded-xl border border-slate-800 bg-black/25 p-3"
                      : ""
                  }`}
                >
                  {post.comment}
                </p>
              ) : null}
              <CommunityPostLikeButton
                className="mt-3"
                initialLikeCount={post.likeCount}
                notificationEntityId={post.movie.fallbackMovieId}
                notificationEntityType={post.popscore ? "review" : "movie"}
                notificationMovieTitle={post.movie.title}
                notificationRecipientUserId={post.user.userId}
                notificationRecipientUsername={post.user.username}
                postId={post.id}
              />
              {post.actionHref && post.actionLabel ? (
                <Link
                  href={post.actionHref}
                  className="mt-3 inline-flex w-fit items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
                >
                  {post.actionLabel}
                </Link>
              ) : null}
              {isCommentPost ? (
                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm font-bold">
                  <button
                    type="button"
                    className="text-slate-300 transition hover:text-yellow-300"
                  >
                    Reply
                  </button>
                  <Link href="/community" className="text-yellow-300">
                    {post.replyLink}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <CommunityPostComments
            initialCommentCount={post.commentCount}
            movieId={post.movie.fallbackMovieId}
            movieTitle={post.movie.title}
            postId={post.id}
          />
        </div>
      </div>
    </article>
  );
}

function FeedPostsList({
  emptyMessage,
  posts,
}: {
  emptyMessage: string;
  posts: CommunityFeedPost[];
}) {
  if (posts.length === 0) {
    return (
      <section className={cardClass("p-6 text-sm font-bold text-slate-300")}>
        {emptyMessage}
      </section>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <CommunityFeedCard key={post.id} post={post} />
      ))}
    </>
  );
}

function SidebarCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {action ?? (
          <Link
            href="/community"
            className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
          >
            See All
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DiscussionBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "spoiler" | "type";
}) {
  const toneClass =
    tone === "spoiler"
      ? "border-red-400/40 bg-red-500/15 text-red-200"
      : tone === "type"
        ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
        : "border-slate-700 bg-slate-900/80 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}
    >
      {children}
    </span>
  );
}

function DiscussionFilters({
  onFilterChange,
  onGenreChange,
  selectedFilter,
  selectedGenre,
}: {
  onFilterChange: (filter: DiscussionFilter) => void;
  onGenreChange: (genre: string) => void;
  selectedFilter: DiscussionFilter;
  selectedGenre: string;
}) {
  return (
    <section className={cardClass("relative z-[60] overflow-visible p-3")}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <FilterMenu
          onSelect={onGenreChange}
          options={genreFilters}
          selectedOption={selectedGenre}
        />
        {discussionFilterOptions.map((filter) => {
          const isSelected = filter === selectedFilter;

          return (
            <button
              key={filter}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onFilterChange(filter)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-black transition ${
                isSelected
                  ? "border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-400/15"
                  : "border-slate-700 bg-slate-950/90 text-slate-100 hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-200"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DiscussionCard({
  discussion,
}: {
  discussion: CommunityDiscussion;
}) {
  return (
    <article className={cardClass("p-3 transition hover:border-yellow-400/40 hover:bg-slate-950/90 sm:p-4")}>
      <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
        <MovieThumb
          alt={discussion.movieTitle}
          fallbackMovieId={discussion.movieId}
          href={communityMovieHref(discussion.movieId)}
          imagePath={discussion.moviePosterUrl}
          wide
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-black leading-6 text-white">
                {discussion.title}
              </h3>
              <p className="mt-2 text-sm font-bold leading-5 text-slate-400">
                <span className="text-slate-200">{discussion.movieTitle}</span>
                {" • "}
                {discussion.commentCount} comments
                {" • "}
                {discussion.likeCount} likes
                {" • "}
                Active {formatRelativePostTime(discussion.lastActiveAt)}
              </p>
            </div>
            <Link
              href={communityDiscussionHref(discussion.id)}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
            >
              Join Discussion
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Avatar label={discussion.startedByAvatarUrl} size="sm" />
            <p className="text-sm font-bold text-slate-300">
              Started by{" "}
              <span className="font-black text-white">
                {discussion.startedByDisplayName}
              </span>
              {discussion.startedByUsername ? (
                <span className="text-slate-500">
                  {" "}
                  @{discussion.startedByUsername}
                </span>
              ) : null}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <DiscussionBadge tone="type">{discussion.type}</DiscussionBadge>
            {discussion.tags.map((tag) => (
              <DiscussionBadge key={tag}>{tag}</DiscussionBadge>
            ))}
            {discussion.isSpoiler ? (
              <DiscussionBadge tone="spoiler">Spoilers</DiscussionBadge>
            ) : (
              <DiscussionBadge>Spoiler-Free</DiscussionBadge>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DiscussionsTabContent({
  discussions,
  onStartDiscussion,
}: {
  discussions: CommunityDiscussion[];
  onStartDiscussion: () => void;
}) {
  const [selectedFilter, setSelectedFilter] =
    useState<DiscussionFilter>("Trending");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const visibleDiscussions = useMemo(
    () => getVisibleDiscussions(discussions, selectedFilter, selectedGenre),
    [discussions, selectedFilter, selectedGenre]
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className={cardClass("p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Discussions</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Jump into movie conversations happening right now.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartDiscussion}
            className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
          >
            + Start Discussion
          </button>
        </div>
      </section>

      <DiscussionFilters
        onFilterChange={setSelectedFilter}
        onGenreChange={setSelectedGenre}
        selectedFilter={selectedFilter}
        selectedGenre={selectedGenre}
      />

      <div className="space-y-4">
        {visibleDiscussions.length > 0 ? (
          visibleDiscussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))
        ) : (
          <section className={cardClass("p-6 text-sm font-bold text-slate-300")}>
            No discussions match those filters yet.
          </section>
        )}
      </div>
    </div>
  );
}

function TrendingDiscussionsCard({
  discussions,
  onSeeAll,
}: {
  discussions: CommunityDiscussion[];
  onSeeAll: () => void;
}) {
  const trendingDiscussions = getVisibleDiscussions(
    discussions,
    "Trending",
    "All Genres"
  ).slice(0, 3);

  return (
    <SidebarCard
      title="Trending Discussions"
      action={
        <button
          type="button"
          onClick={onSeeAll}
          className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          See All
        </button>
      }
    >
      <div className="space-y-4">
        {trendingDiscussions.map((discussion) => (
          <div
            key={discussion.id}
            className="grid grid-cols-[82px_1fr] items-center gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
          >
            <MovieThumb
              alt={discussion.title}
              fallbackMovieId={discussion.movieId}
              fit="contain"
              href={communityDiscussionHref(discussion.id)}
              imagePath={discussion.moviePosterUrl}
            />
            <div className="min-w-0">
              <p className="text-sm font-black leading-5 text-white">
                {discussion.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {discussion.commentCount} comments
              </p>
            </div>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function WhoToFollowCard({
  emptyMessage = "No users match those filters yet.",
  users = suggestedFollows.slice(0, 4),
}: {
  emptyMessage?: string;
  users?: SuggestedFollow[];
}) {
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const followUser = async (user: SuggestedFollow) => {
    if (followedUsers.has(user.username)) {
      return;
    }

    setFollowedUsers((currentUsers) => {
      const nextUsers = new Set(currentUsers);

      nextUsers.add(user.username);

      return nextUsers;
    });

    const actor = await getCurrentNotificationActor();

    await createNotification({
      actorUserId: actor.userId,
      actorUsername: actor.username,
      entityId: actor.username ?? actor.userId,
      entityType: "user_profile",
      message: `${actor.displayName} started following you.`,
      recipientUserId: user.userId,
      recipientUsername: user.username,
      type: "follow",
    });
  };

  return (
    <SidebarCard title="Who to Follow">
      <div className="space-y-4">
        {users.length > 0 ? (
          users.slice(0, 4).map((user) => {
            const isFollowing = followedUsers.has(user.username);

            return (
              <div key={user.username} className="flex items-center gap-3">
                <Avatar label={user.avatar} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white">{user.displayName}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                    @{user.username}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    Favorite: {user.favoriteGenre}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isFollowing}
                  onClick={() => void followUser(user)}
                  className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                    isFollowing
                      ? "border-slate-700 bg-slate-800 text-slate-400"
                      : "border-yellow-400/70 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-sm font-bold text-slate-400">{emptyMessage}</p>
        )}
      </div>
    </SidebarCard>
  );
}

function ratingCountText(count: number) {
  return `${count} review${count === 1 ? "" : "s"} submitted`;
}

function RatingCountBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={ratingCountText(count)}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/40 bg-yellow-400/20 text-sm font-black text-yellow-200 shadow-lg shadow-yellow-400/10"
      style={{
        clipPath:
          "polygon(50% 0%, 92% 25%, 92% 75%, 50% 100%, 8% 75%, 8% 25%)",
      }}
    >
      {count}
    </span>
  );
}

function TopReviewersList({
  reviewers,
}: {
  reviewers: TopReviewerSummary[];
}) {
  return (
    <div className="space-y-3">
      {reviewers.map((reviewer, index) => (
        <div
          key={reviewer.userId}
          className="grid grid-cols-[24px_40px_1fr_auto] items-center gap-3"
        >
          <span className="text-sm font-black text-white">{index + 1}</span>
          <Avatar label={reviewer.avatar} />
          <div className="min-w-0">
            <p className="truncate font-black text-white">{reviewer.username}</p>
            <p className="mt-1 text-xs font-bold text-slate-300">
              {ratingCountText(reviewer.totalReviews)}
            </p>
          </div>
          <RatingCountBadge count={reviewer.totalReviews} />
        </div>
      ))}
    </div>
  );
}

function TopReviewersCard({
  isLoading,
  reviewers,
}: {
  isLoading: boolean;
  reviewers: TopReviewerSummary[];
}) {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const previewReviewers = reviewers.slice(0, 5);
  const leaderboardReviewers = reviewers.slice(0, 150);

  return (
    <SidebarCard
      title="Top Reviewers"
      action={
        reviewers.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
          >
            See All
          </button>
        ) : (
          <span />
        )
      }
    >
      {isLoading ? (
        <p className="text-sm font-bold text-slate-400">Loading reviewers...</p>
      ) : previewReviewers.length > 0 ? (
        <TopReviewersList reviewers={previewReviewers} />
      ) : (
        <p className="text-sm font-bold text-slate-400">
          No reviewer rankings yet.
        </p>
      )}

      {isLeaderboardOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Top 150 raters"
          className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-16 backdrop-blur-sm"
          onMouseDown={() => setIsLeaderboardOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">
                  Top 150 Raters
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Ranked by total reviews submitted.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close top raters"
                onClick={() => setIsLeaderboardOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
              >
                X
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-800 bg-black/25 p-3">
              <TopReviewersList reviewers={leaderboardReviewers} />
            </div>
          </div>
        </div>
      ) : null}
    </SidebarCard>
  );
}

function FollowingTabContent() {
  const [userSearch, setUserSearch] = useState("");
  const [selectedFavoriteGenre, setSelectedFavoriteGenre] =
    useState("All Genres");
  const visibleUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();

    return suggestedFollows.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.displayName.toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch);
      const matchesGenre =
        selectedFavoriteGenre === "All Genres" ||
        user.favoriteGenre === selectedFavoriteGenre;

      return matchesSearch && matchesGenre;
    });
  }, [selectedFavoriteGenre, userSearch]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <section className={cardClass("relative z-[60] overflow-visible p-4 sm:p-5")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-black/35 px-4 text-sm font-bold text-slate-400 shadow-inner shadow-black/20">
            <span aria-hidden="true" className="text-lg">
              ⌕
            </span>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
              placeholder="Search users..."
              type="search"
            />
          </label>
          <FilterMenu
            onSelect={setSelectedFavoriteGenre}
            options={genreFilters}
            selectedOption={selectedFavoriteGenre}
          />
        </div>
      </section>

      <WhoToFollowCard users={visibleUsers} />
    </div>
  );
}

export default function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("Feed");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedTrend, setSelectedTrend] = useState("Trending");
  const [isMovieDialogOpen, setIsMovieDialogOpen] = useState(false);
  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = useState(false);
  const [createdDiscussions, setCreatedDiscussions] = useState<
    CommunityDiscussion[]
  >([]);
  const [communityRatings, setCommunityRatings] = useState<
    CommunityRatingFeedItem[]
  >([]);
  const [topReviewers, setTopReviewers] = useState<TopReviewerSummary[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(true);
  const communityDiscussions = useMemo(
    () => [...createdDiscussions, ...mockCommunityDiscussions],
    [createdDiscussions]
  );
  const discussionActivityPosts = useMemo(
    () => createdDiscussions.map(discussionToFeedPost),
    [createdDiscussions]
  );
  const realFeedPosts = useMemo(
    () => communityRatings.map(mapCommunityRatingToPost),
    [communityRatings]
  );
  const feedPostsToShow = useMemo(
    () =>
      realFeedPosts.length > 0
        ? [...discussionActivityPosts, ...realFeedPosts]
        : [...discussionActivityPosts, ...feedPosts],
    [discussionActivityPosts, realFeedPosts]
  );
  const visibleFeedPosts = useMemo(
    () => getVisibleFeedPosts(feedPostsToShow, selectedGenre, selectedTrend),
    [feedPostsToShow, selectedGenre, selectedTrend]
  );
  const isFollowingTab = selectedTab === "Following";
  const showDiscussions = () => {
    setSelectedTab("Discussions");
    window.requestAnimationFrame(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    });
  };

  const saveCreatedDiscussions = (nextDiscussions: CommunityDiscussion[]) => {
    window.localStorage.setItem(
      communityDiscussionsStorageKey,
      JSON.stringify(nextDiscussions)
    );
  };

  const postDiscussion = (discussion: CommunityDiscussion) => {
    setCreatedDiscussions((currentDiscussions) => {
      const nextDiscussions = [
        discussion,
        ...currentDiscussions.filter(
          (currentDiscussion) => currentDiscussion.id !== discussion.id
        ),
      ];

      saveCreatedDiscussions(nextDiscussions);

      return nextDiscussions;
    });
    setIsDiscussionDialogOpen(false);
    setSelectedTab("Discussions");
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCreatedDiscussions(
        parseStoredCommunityDiscussions(
          window.localStorage.getItem(communityDiscussionsStorageKey)
        )
      );
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getRecentCommunityRatings(30), getTopReviewers(150)])
      .then(([ratings, reviewers]) => {
        if (isCurrent) {
          setCommunityRatings(ratings);
          setTopReviewers(reviewers);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCommunityRatings([]);
          setTopReviewers([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingReviewers(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-7 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Community
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Discover what movie fans are loving, debating, rating, and
                talking about right now.
              </p>
            </div>
            <CommunitySearch />
          </div>
          <div className="mt-6">
            <CommunityTabs selectedTab={selectedTab} onSelect={setSelectedTab} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-4 sm:space-y-5">
            {selectedTab === "Feed" ? (
              <>
                <CreatePostBox onSelectMovie={() => setIsMovieDialogOpen(true)} />
                <CommunityFilters
                  onGenreChange={setSelectedGenre}
                  onTrendChange={setSelectedTrend}
                  selectedGenre={selectedGenre}
                  selectedTrend={selectedTrend}
                />
                <FeedPostsList
                  posts={visibleFeedPosts}
                  emptyMessage="No posts match that filter yet."
                />
              </>
            ) : selectedTab === "Discussions" ? (
              <DiscussionsTabContent
                discussions={communityDiscussions}
                onStartDiscussion={() => setIsDiscussionDialogOpen(true)}
              />
            ) : (
              <FollowingTabContent />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            {isFollowingTab ? null : (
              <>
                <TrendingDiscussionsCard
                  discussions={communityDiscussions}
                  onSeeAll={showDiscussions}
                />
                <WhoToFollowCard />
              </>
            )}
            <TopReviewersCard
              isLoading={isLoadingReviewers}
              reviewers={topReviewers}
            />
          </aside>
        </section>
      </section>
      {isMovieDialogOpen ? (
        <SelectMovieDialog onClose={() => setIsMovieDialogOpen(false)} />
      ) : null}
      {isDiscussionDialogOpen ? (
        <StartDiscussionModal
          onClose={() => setIsDiscussionDialogOpen(false)}
          onPost={postDiscussion}
        />
      ) : null}
    </main>
  );
}
