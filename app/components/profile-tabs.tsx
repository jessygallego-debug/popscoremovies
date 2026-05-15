"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import QuickReactionBadge from "@/app/components/quick-reaction-badge";
import {
  avatarForKey,
  genreLabelForKey,
  PROFILE_GENRES,
} from "@/lib/profile-config";
import {
  getProfileByUsername,
  getUserRatings,
  getWatchlist,
  ProfileRecord,
  removeFromWatchlist,
  UserMovieRating,
  WatchlistMovie,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";

type TabKey = "stats" | "watchlist" | "discover";

type ProfileStatSummary = {
  average: number;
  highestGenre: string;
  lowestGenre: string;
  mostRatedGenre: string;
  totalMovieReactions: number;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function yearFromDate(date?: string | null) {
  return date?.split("-")[0] ?? "";
}

function hasPopScoreRating(rating: UserMovieRating) {
  return rating.weights.length > 0 && Object.keys(rating.ratings).length > 0;
}

function getProfileStatSummary(ratings: UserMovieRating[]): ProfileStatSummary {
  const popScoreRatings = ratings.filter(hasPopScoreRating);
  const average =
    popScoreRatings.length > 0
      ? Math.round(
          popScoreRatings.reduce(
            (total, rating) => total + rating.popscore,
            0
          ) / popScoreRatings.length
        )
      : 0;
  const totalMovieReactions = ratings.filter(
    (rating) =>
      !hasPopScoreRating(rating) &&
      (rating.quick_reaction === "loved_it" ||
        rating.quick_reaction === "worth_watching" ||
        rating.quick_reaction === "trash")
  ).length;
  const totals = new Map<string, { count: number; total: number }>();

  popScoreRatings.forEach((rating) => {
    const genre = rating.genreNames[0] ?? genreLabelForKey(rating.genre);
    const current = totals.get(genre) ?? { count: 0, total: 0 };
    totals.set(genre, {
      count: current.count + 1,
      total: current.total + rating.popscore,
    });
  });

  const genreStats = Array.from(totals.entries()).map(([genre, stats]) => ({
    average: Math.round(stats.total / stats.count),
    count: stats.count,
    genre,
  }));
  const mostRated = [...genreStats].sort((a, b) => b.count - a.count)[0];
  const highest = [...genreStats].sort((a, b) => b.average - a.average)[0];
  const lowest = [...genreStats].sort((a, b) => a.average - b.average)[0];

  return {
    average,
    highestGenre: highest?.genre ?? "None",
    lowestGenre: lowest?.genre ?? "None",
    mostRatedGenre: mostRated?.genre ?? "None",
    totalMovieReactions,
  };
}

function ProfileHeader({
  profile,
  ratings,
}: {
  profile: ProfileRecord;
  ratings: UserMovieRating[];
}) {
  const avatar = avatarForKey(profile.avatar_key);
  const stats = getProfileStatSummary(ratings);
  const totalMoviesRated = ratings.filter(hasPopScoreRating).length;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-5xl">
            {avatar.icon}
          </span>
          <div>
            <h1 className="text-4xl font-black text-white">@{profile.username}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300">
              {profile.favorite_genre ? (
                <span className="rounded-full bg-yellow-400 px-3 py-1 text-black">
                  {genreLabelForKey(profile.favorite_genre)}
                </span>
              ) : null}
              <span>Member since {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-full border border-slate-700 bg-black/30 px-4 py-2 text-sm font-black text-slate-200 transition hover:border-yellow-400 hover:text-yellow-300"
        >
          Edit PopFile
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon="▣"
          label="Total Movies Rated"
          value={totalMoviesRated}
        />
        <StatCard
          icon="♡"
          label="Total Movie Reactions"
          value={stats.totalMovieReactions}
        />
        <StatCard
          icon="↗"
          label="Average PopScore"
          value={totalMoviesRated ? `${stats.average}%` : "NR"}
        />
        <StatCard
          icon="☆"
          label="Most Rated Genre"
          value={stats.mostRatedGenre}
        />
        <StatCard
          icon="♕"
          label="Highest Rated Genre"
          value={stats.highestGenre}
        />
        <StatCard
          icon="↘"
          label="Lowest Rated Genre"
          value={stats.lowestGenre}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex min-h-24 items-center gap-4 rounded-2xl border border-slate-800 bg-black/40 p-5">
      <span className="text-3xl font-black text-yellow-400">{icon}</span>
      <div>
        <p className="text-2xl font-black text-yellow-400">{value}</p>
        <p className="mt-1 text-xs font-black uppercase text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function RatingsHistory({ ratings }: { ratings: UserMovieRating[] }) {
  if (ratings.length === 0) {
    return <EmptyState text="No ratings yet." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ratings.map((rating) => (
        <article
          key={rating.id}
          className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4"
        >
          <MoviePoster path={rating.posterPath} title={rating.movieTitle} />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-black text-white">{rating.movieTitle}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {rating.genreNames[0] ?? genreLabelForKey(rating.genre)}
            </p>
            <p className="mt-3 text-2xl font-black text-yellow-400">
              {rating.popscore}%
            </p>
            <div className="mt-2">
              <QuickReactionBadge reaction={rating.quick_reaction} />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">
              Rated {formatDate(rating.updated_at)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function WatchlistGrid({
  onRemove,
  watchlist,
}: {
  onRemove: (movieId: string) => void;
  watchlist: WatchlistMovie[];
}) {
  if (watchlist.length === 0) {
    return <EmptyState text="No movies in watchlist yet." />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {watchlist.map((movie) => (
        <article
          key={movie.id}
          className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4"
        >
          <div className="flex gap-4">
            <MoviePoster path={movie.posterPath} title={movie.movieTitle} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-black text-white">{movie.movieTitle}</h3>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {movie.genreNames[0] ?? movie.genre}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {yearFromDate(movie.releaseDate)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/rate?movie=${movie.movieId}&returnTo=/profile/edit`}
              className="flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-center text-sm font-black text-black"
            >
              Rate Now
            </Link>
            <button
              type="button"
              onClick={() => onRemove(movie.movieId)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:border-yellow-400"
            >
              Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function DiscoverRecommendations({
  ratedMovieIds,
}: {
  ratedMovieIds: string[];
}) {
  const [genre, setGenre] = useState(PROFILE_GENRES[0].key);
  const [movies, setMovies] = useState<
    { id: number; poster_path: string | null; release_date: string; title: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    fetch(`/api/recommendations?genre=${encodeURIComponent(genre)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!isCurrent) {
          return;
        }

        const rated = new Set(ratedMovieIds);
        setMovies(
          (data.movies ?? []).filter(
            (movie: { id: number }) => !rated.has(String(movie.id))
          )
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [genre, ratedMovieIds]);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible lg:grid lg:grid-cols-8 lg:gap-3">
        {PROFILE_GENRES.map((nextGenre) => (
          <button
            key={nextGenre.key}
            type="button"
            onClick={() => setGenre(nextGenre.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black lg:w-full ${
              genre === nextGenre.key
                ? "border-yellow-400 bg-yellow-400 text-black"
                : "border-slate-700 bg-slate-950 text-slate-300"
            }`}
          >
            {nextGenre.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="mt-6 font-bold text-slate-400">Loading...</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {movies.slice(0, 10).map((movie) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
          >
            <div className="relative aspect-[2/3] bg-slate-900">
              <MoviePosterImage
                src={posterUrl(movie.poster_path)}
                alt={movie.title}
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-black text-white">
                {movie.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {yearFromDate(movie.release_date)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MoviePoster({ path, title }: { path?: string | null; title: string }) {
  const poster = posterUrl(path ?? null);

  return (
    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
      <MoviePosterImage
        src={poster}
        alt={title}
        sizes="80px"
        className="object-cover"
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 font-bold text-slate-400">
      {text}
    </div>
  );
}

export default function ProfileTabs({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: TabKey =
    requestedTab === "watchlist" || requestedTab === "discover"
      ? requestedTab
      : "stats";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [ratings, setRatings] = useState<UserMovieRating[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setActiveTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    getProfileByUsername(username).then((nextProfile) => {
      setProfile(nextProfile);
      if (!nextProfile) {
        setIsLoading(false);
        return;
      }

      Promise.all([
        getUserRatings(nextProfile.user_id),
        getWatchlist(nextProfile.user_id),
      ]).then(([nextRatings, nextWatchlist]) => {
        setRatings(nextRatings);
        setWatchlist(nextWatchlist);
        setIsLoading(false);
      });
    });
  }, [username]);

  if (isLoading) {
    return <EmptyState text="Loading profile..." />;
  }

  if (!profile) {
    return <EmptyState text="Profile not found." />;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "stats", label: "Stats" },
    { key: "watchlist", label: "Watchlist" },
    { key: "discover", label: "Discover" },
  ];

  return (
    <div>
      <ProfileHeader profile={profile} ratings={ratings} />
      <div className="my-6 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-5 py-2.5 text-sm font-black ${
              activeTab === tab.key
                ? "border-yellow-400 bg-yellow-400 text-black"
                : "border-slate-700 bg-slate-950 text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stats" ? (
        <RatingsHistory ratings={ratings.filter(hasPopScoreRating)} />
      ) : null}
      {activeTab === "watchlist" ? (
        <WatchlistGrid
          watchlist={watchlist}
          onRemove={(movieId) => {
            removeFromWatchlist(movieId).then(() => {
              setWatchlist((current) =>
                current.filter((movie) => movie.movieId !== movieId)
              );
            });
          }}
        />
      ) : null}
      {activeTab === "discover" ? (
        <DiscoverRecommendations
          ratedMovieIds={ratings
            .filter(hasPopScoreRating)
            .map((rating) => rating.movieId)}
        />
      ) : null}
    </div>
  );
}
