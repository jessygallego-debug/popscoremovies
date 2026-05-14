"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type TabKey = "ratings" | "watchlist" | "discover" | "stats";

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

function ProfileHeader({
  profile,
  ratings,
  watchlist,
}: {
  profile: ProfileRecord;
  ratings: UserMovieRating[];
  watchlist: WatchlistMovie[];
}) {
  const avatar = avatarForKey(profile.avatar_key);
  const average =
    ratings.length > 0
      ? Math.round(
          ratings.reduce((total, rating) => total + rating.popscore, 0) /
            ratings.length
        )
      : 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center gap-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-5xl">
          {avatar.icon}
        </span>
        <div>
          <h1 className="text-4xl font-black text-white">@{profile.username}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300">
            {profile.favorite_genre ? (
              <span className="rounded-full bg-yellow-400 px-3 py-1 text-black">
                {genreLabelForKey(profile.favorite_genre)}
              </span>
            ) : null}
            <span>Member since {formatDate(profile.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rated" value={ratings.length} />
        <StatCard label="Avg PopScore" value={ratings.length ? `${average}%` : "NR"} />
        <StatCard label="Watchlist" value={watchlist.length} />
        <StatCard
          label="Loved It"
          value={ratings.filter((rating) => rating.quick_reaction === "loved_it").length}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/40 p-4">
      <p className="text-2xl font-black text-yellow-400">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-slate-500">{label}</p>
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

function ProfileStats({
  profile,
  ratings,
  watchlist,
}: {
  profile: ProfileRecord;
  ratings: UserMovieRating[];
  watchlist: WatchlistMovie[];
}) {
  const genreStats = useMemo(() => {
    const totals = new Map<string, { count: number; total: number }>();
    ratings.forEach((rating) => {
      const genre = rating.genreNames[0] ?? rating.genre;
      const current = totals.get(genre) ?? { count: 0, total: 0 };
      totals.set(genre, {
        count: current.count + 1,
        total: current.total + rating.popscore,
      });
    });
    return Array.from(totals.entries()).map(([genre, stats]) => ({
      average: Math.round(stats.total / stats.count),
      count: stats.count,
      genre,
    }));
  }, [ratings]);

  const average =
    ratings.length > 0
      ? Math.round(
          ratings.reduce((total, rating) => total + rating.popscore, 0) /
            ratings.length
        )
      : 0;
  const mostRated = [...genreStats].sort((a, b) => b.count - a.count)[0];
  const highest = [...genreStats].sort((a, b) => b.average - a.average)[0];
  const lowest = [...genreStats].sort((a, b) => a.average - b.average)[0];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total movies rated" value={ratings.length} />
      <StatCard label="Average PopScore" value={ratings.length ? `${average}%` : "NR"} />
      <StatCard label="Favorite genre" value={genreLabelForKey(profile.favorite_genre)} />
      <StatCard label="Most rated genre" value={mostRated?.genre ?? "None"} />
      <StatCard label="Highest-rated genre" value={highest?.genre ?? "None"} />
      <StatCard label="Lowest-rated genre" value={lowest?.genre ?? "None"} />
      <StatCard
        label="Loved It count"
        value={ratings.filter((rating) => rating.quick_reaction === "loved_it").length}
      />
      <StatCard
        label="Worth Watching count"
        value={
          ratings.filter((rating) => rating.quick_reaction === "worth_watching")
            .length
        }
      />
      <StatCard
        label="Trash count"
        value={ratings.filter((rating) => rating.quick_reaction === "trash").length}
      />
      <StatCard label="Watchlist count" value={watchlist.length} />
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
      <div className="flex flex-wrap gap-2">
        {PROFILE_GENRES.map((nextGenre) => (
          <button
            key={nextGenre.key}
            type="button"
            onClick={() => setGenre(nextGenre.key)}
            className={`rounded-full border px-4 py-2 text-sm font-black ${
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
              {posterUrl(movie.poster_path) ? (
                <Image
                  src={posterUrl(movie.poster_path) as string}
                  alt={movie.title}
                  fill
                  sizes="20vw"
                  className="object-cover"
                />
              ) : null}
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
      {poster ? (
        <Image src={poster} alt={title} fill sizes="80px" className="object-cover" />
      ) : null}
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
  const [activeTab, setActiveTab] = useState<TabKey>("ratings");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [ratings, setRatings] = useState<UserMovieRating[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    { key: "ratings", label: "Ratings" },
    { key: "watchlist", label: "Watchlist" },
    { key: "discover", label: "Discover" },
    { key: "stats", label: "Stats" },
  ];

  return (
    <div>
      <ProfileHeader profile={profile} ratings={ratings} watchlist={watchlist} />
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

      {activeTab === "ratings" ? <RatingsHistory ratings={ratings} /> : null}
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
        <DiscoverRecommendations ratedMovieIds={ratings.map((rating) => rating.movieId)} />
      ) : null}
      {activeTab === "stats" ? (
        <ProfileStats profile={profile} ratings={ratings} watchlist={watchlist} />
      ) : null}
    </div>
  );
}
