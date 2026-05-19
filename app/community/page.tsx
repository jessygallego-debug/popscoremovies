"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CommunityPostComments from "@/app/components/community-post-comments";
import CommunityPostLikeButton from "@/app/components/community-post-like-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import SiteHeader from "@/app/components/site-header";
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
  username: string;
};

type CommunityFeedPost = {
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
  reaction?: string;
  replyLink?: string;
  timestamp: string;
  user: CommunityUser;
};

type Discussion = {
  commentCount: number;
  fallbackMovieId: string;
  imagePath: string | null;
  title: string;
};

type SuggestedFollow = CommunityUser & {
  favoriteGenre: string;
};

type MovieSuggestion = {
  id: number;
  releaseDate: string;
  title: string;
};

const feedTabs = ["Feed", "Following", "Discussions", "People"] as const;

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

const followedUsernames = new Set(["jessy", "moviemike", "linarose"]);

const feedPosts: CommunityFeedPost[] = [
  {
    id: "interstellar-rating",
    user: {
      avatar: "🔥",
      displayName: "Jessy",
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
    reaction: "🔥 Loved It",
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
    reaction: "🍿 Worth Watching",
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
    reaction: "🔥 Loved It",
    comment: "Absolutely stunning. Villeneuve is in a league of his own.",
    genres: ["Action", "Adventure", "Drama", "Sci-Fi"],
    likeCount: 31,
    commentCount: 5,
    interactedAvatars: ["🚀", "🎬", "🔥", "🎥"],
    extraInteractions: 22,
  },
];

const discussions: Discussion[] = [
  {
    title: "Was Interstellar Nolan's best movie?",
    commentCount: 68,
    fallbackMovieId: "157336",
    imagePath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    title: "The ending of Sinners explained (spoilers)",
    commentCount: 42,
    fallbackMovieId: "1233413",
    imagePath: null,
  },
  {
    title: "Best plot twists of all time?",
    commentCount: 91,
    fallbackMovieId: "1124",
    imagePath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
  },
];

const suggestedFollows: SuggestedFollow[] = [
  {
    avatar: "👻",
    displayName: "Lina Rose",
    username: "linarose",
    favoriteGenre: "Horror",
  },
  {
    avatar: "🎬",
    displayName: "MovieMike",
    username: "moviemike",
    favoriteGenre: "Action",
  },
  {
    avatar: "🎥",
    displayName: "FilmFanatic",
    username: "filmfanatic",
    favoriteGenre: "Drama",
  },
  {
    avatar: "🚀",
    displayName: "CinephileChris",
    username: "cinephilechris",
    favoriteGenre: "Sci-Fi",
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

function reactionForScore(score: number) {
  if (score >= 90) {
    return "🔥 Loved It";
  }

  if (score >= 75) {
    return "🍿 Worth Watching";
  }

  if (score >= 60) {
    return "⭐ Fresh Pick";
  }

  return "🎬 Rated";
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
  href,
  imagePath,
  wide = false,
}: {
  alt: string;
  fallbackMovieId: string;
  href?: string;
  imagePath: string | null;
  wide?: boolean;
}) {
  const thumb = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900 transition ${
        wide
          ? "mx-auto aspect-[2/3] w-full max-w-[145px] sm:mx-0 sm:max-w-none"
          : "aspect-[4/3]"
      } ${
        href
          ? "shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:shadow-yellow-400/10"
          : ""
      }`}
    >
      <MoviePosterImage
        alt={alt}
        className="object-cover"
        fallbackMovieId={fallbackMovieId}
        sizes={wide ? "(min-width: 1024px) 120px, 145px" : "96px"}
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

function CreatePostBox({ onSelectMovie }: { onSelectMovie: () => void }) {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar label="🔥" size="lg" />
        <p className="min-w-0 flex-1 text-base font-semibold text-slate-300">
          What movie is on your mind?
        </p>
        <button
          type="button"
          onClick={onSelectMovie}
          className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
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
                <p
                  className={`text-base font-black ${
                    post.reaction.includes("Loved")
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {post.reaction}
                </p>
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
                postId={post.id}
              />
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
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <Link
          href="/community"
          className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          See All
        </Link>
      </div>
      {children}
    </section>
  );
}

function DiscussionsTabContent() {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">Discussions</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Jump into movie conversations happening right now.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {discussions.map((discussion) => (
          <article
            key={discussion.title}
            className="grid grid-cols-[92px_1fr] items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3"
          >
            <MovieThumb
              alt={discussion.title}
              fallbackMovieId={discussion.fallbackMovieId}
              href={communityMovieHref(discussion.fallbackMovieId)}
              imagePath={discussion.imagePath}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-black leading-5 text-white">
                {discussion.title}
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {discussion.commentCount} comments
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TrendingDiscussionsCard() {
  return (
    <SidebarCard title="Trending Discussions">
      <div className="space-y-4">
        {discussions.map((discussion) => (
          <div
            key={discussion.title}
            className="grid grid-cols-[82px_1fr] items-center gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
          >
            <MovieThumb
              alt={discussion.title}
              fallbackMovieId={discussion.fallbackMovieId}
              href={communityMovieHref(discussion.fallbackMovieId)}
              imagePath={discussion.imagePath}
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

function WhoToFollowCard() {
  return (
    <SidebarCard title="Who to Follow">
      <div className="space-y-4">
        {suggestedFollows.map((user) => (
          <div key={user.username} className="flex items-center gap-3">
            <Avatar label={user.avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-black text-white">{user.displayName}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                Favorite: {user.favoriteGenre}
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-yellow-400/70 px-4 py-2 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function ReviewCountBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} reviews`}
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

function TopReviewersCard({
  isLoading,
  reviewers,
}: {
  isLoading: boolean;
  reviewers: TopReviewerSummary[];
}) {
  return (
    <SidebarCard title="Top Reviewers">
      {isLoading ? (
        <p className="text-sm font-bold text-slate-400">Loading reviewers...</p>
      ) : reviewers.length > 0 ? (
        <div className="space-y-4">
          {reviewers.map((reviewer, index) => (
          <div
            key={reviewer.userId}
            className="grid grid-cols-[24px_40px_1fr_auto] items-center gap-3"
          >
            <span className="text-sm font-black text-white">{index + 1}</span>
            <Avatar label={reviewer.avatar} />
            <div className="min-w-0">
              <p className="truncate font-black text-white">
                {reviewer.username}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                {reviewer.totalReviews} reviews
              </p>
            </div>
            <ReviewCountBadge count={reviewer.totalReviews} />
          </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">
          No reviewer rankings yet.
        </p>
      )}
    </SidebarCard>
  );
}

function PeopleTabContent({
  isLoadingReviewers,
  topReviewers,
}: {
  isLoadingReviewers: boolean;
  topReviewers: TopReviewerSummary[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WhoToFollowCard />
      <TopReviewersCard
        isLoading={isLoadingReviewers}
        reviewers={topReviewers}
      />
    </div>
  );
}

export default function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("Feed");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedTrend, setSelectedTrend] = useState("Trending");
  const [isMovieDialogOpen, setIsMovieDialogOpen] = useState(false);
  const [communityRatings, setCommunityRatings] = useState<
    CommunityRatingFeedItem[]
  >([]);
  const [topReviewers, setTopReviewers] = useState<TopReviewerSummary[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(true);
  const realFeedPosts = useMemo(
    () => communityRatings.map(mapCommunityRatingToPost),
    [communityRatings]
  );
  const feedPostsToShow = realFeedPosts.length > 0 ? realFeedPosts : feedPosts;
  const visibleFeedPosts = useMemo(
    () => getVisibleFeedPosts(feedPostsToShow, selectedGenre, selectedTrend),
    [feedPostsToShow, selectedGenre, selectedTrend]
  );
  const visibleFollowingPosts = useMemo(
    () =>
      visibleFeedPosts.filter((post) => followedUsernames.has(post.user.username)),
    [visibleFeedPosts]
  );
  const tabFeedPosts =
    selectedTab === "Following" ? visibleFollowingPosts : visibleFeedPosts;

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getRecentCommunityRatings(30), getTopReviewers(5)])
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
                See what PopScore fans are rating, reviewing, and discovering
                right now.
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
            <CreatePostBox onSelectMovie={() => setIsMovieDialogOpen(true)} />
            {selectedTab === "Feed" || selectedTab === "Following" ? (
              <>
                <CommunityFilters
                  onGenreChange={setSelectedGenre}
                  onTrendChange={setSelectedTrend}
                  selectedGenre={selectedGenre}
                  selectedTrend={selectedTrend}
                />
                <FeedPostsList
                  posts={tabFeedPosts}
                  emptyMessage={
                    selectedTab === "Following"
                      ? "No followed posts match that filter yet."
                      : "No posts match that filter yet."
                  }
                />
              </>
            ) : selectedTab === "Discussions" ? (
              <DiscussionsTabContent />
            ) : (
              <PeopleTabContent
                isLoadingReviewers={isLoadingReviewers}
                topReviewers={topReviewers}
              />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <TrendingDiscussionsCard />
            <WhoToFollowCard />
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
    </main>
  );
}
