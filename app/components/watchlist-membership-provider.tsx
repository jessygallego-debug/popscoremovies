"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePopFile } from "@/app/components/popfile-provider";
import {
  getWatchlistMovieIds,
  POPSCORE_WATCHLIST_UPDATED_EVENT,
  type WatchlistMembershipUpdate,
} from "@/lib/profile-store";

type WatchlistMembership = {
  hasLoadError: boolean;
  isLoaded: boolean;
  movieIds: ReadonlySet<string>;
};

type MembershipSnapshot = {
  hasLoadError: boolean;
  movieIds: ReadonlySet<string>;
  userId: string | null;
};

const WatchlistMembershipContext = createContext<WatchlistMembership | null>(null);
const EMPTY_MOVIE_IDS = new Set<string>();

function applyLocalUpdates(
  movieIds: string[],
  updates: WatchlistMembershipUpdate[],
  userId: string
) {
  const nextIds = new Set(movieIds);
  for (const update of updates) {
    if (update.userId !== userId) continue;
    if (update.isOnWatchlist) nextIds.add(update.movieId);
    else nextIds.delete(update.movieId);
  }
  return nextIds;
}

export function WatchlistMembershipProvider({ children }: { children: ReactNode }) {
  const { isLoading: isProfileLoading, user } = usePopFile();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<MembershipSnapshot>({
    hasLoadError: false,
    movieIds: EMPTY_MOVIE_IDS,
    userId: null,
  });
  const updatesRef = useRef<WatchlistMembershipUpdate[]>([]);

  useEffect(() => {
    if (!userId) return;

    let isCurrent = true;
    updatesRef.current = [];

    getWatchlistMovieIds(userId)
      .then((movieIds) => {
        if (!isCurrent) return;

        setSnapshot({
          hasLoadError: false,
          movieIds: applyLocalUpdates(movieIds, updatesRef.current, userId),
          userId,
        });
      })
      .catch(() => {
        if (isCurrent) {
          setSnapshot({
            hasLoadError: true,
            movieIds: applyLocalUpdates([], updatesRef.current, userId),
            userId,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  useEffect(() => {
    const onWatchlistUpdate = (event: Event) => {
      const update = (event as CustomEvent<WatchlistMembershipUpdate>).detail;
      if (!update || update.userId !== userId) return;

      updatesRef.current.push(update);
      setSnapshot((current) => {
        if (current.userId !== userId) return current;
        const nextIds = new Set(current.movieIds);
        if (update.isOnWatchlist) nextIds.add(update.movieId);
        else nextIds.delete(update.movieId);
        return { ...current, movieIds: nextIds };
      });
    };

    window.addEventListener(POPSCORE_WATCHLIST_UPDATED_EVENT, onWatchlistUpdate);
    return () => {
      window.removeEventListener(POPSCORE_WATCHLIST_UPDATED_EVENT, onWatchlistUpdate);
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      hasLoadError: Boolean(userId && snapshot.userId === userId && snapshot.hasLoadError),
      isLoaded: !isProfileLoading && (!userId || snapshot.userId === userId),
      movieIds: userId && snapshot.userId === userId
        ? snapshot.movieIds
        : EMPTY_MOVIE_IDS,
    }),
    [isProfileLoading, snapshot, userId]
  );

  return (
    <WatchlistMembershipContext.Provider value={value}>
      {children}
    </WatchlistMembershipContext.Provider>
  );
}

export function useWatchlistMembership() {
  const context = useContext(WatchlistMembershipContext);
  if (!context) {
    throw new Error("useWatchlistMembership must be used inside its provider.");
  }
  return context;
}
