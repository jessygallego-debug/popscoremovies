"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCurrentUser,
  getProfileByUserId,
  ProfileRecord,
  signOut as clearPopFileSession,
  SupabaseUser,
} from "@/lib/profile-store";

const PROFILE_LOAD_RETRY_DELAYS_MS = [350, 900];

type PopFileContextValue = {
  isLoading: boolean;
  profile: ProfileRecord | null;
  refreshProfile: () => Promise<ProfileRecord | null>;
  setCachedProfile: (profile: ProfileRecord | null) => void;
  signOut: () => void;
  user: SupabaseUser | null;
};

const PopFileContext = createContext<PopFileContextValue | null>(null);

function waitForProfileRetry(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function loadPopFileSnapshot() {
  const nextUser = await getCurrentUser();
  const nextProfile = nextUser
    ? await getProfileByUserId(nextUser.id)
    : null;

  return { nextProfile, nextUser };
}

async function loadPopFileSnapshotWithRetry() {
  for (
    let attempt = 0;
    attempt <= PROFILE_LOAD_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      return await loadPopFileSnapshot();
    } catch {
      if (attempt >= PROFILE_LOAD_RETRY_DELAYS_MS.length) {
        return { nextProfile: null, nextUser: null };
      }

      await waitForProfileRetry(PROFILE_LOAD_RETRY_DELAYS_MS[attempt]);
    }
  }

  return { nextProfile: null, nextUser: null };
}

export function PopFileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);

    const { nextProfile, nextUser } = await loadPopFileSnapshotWithRetry();

    setUser(nextUser);
    setProfile(nextProfile);
    setIsLoading(false);

    return nextProfile;
  }, []);

  const setCachedProfile = useCallback((nextProfile: ProfileRecord | null) => {
    setProfile(nextProfile);
  }, []);

  const signOut = useCallback(() => {
    clearPopFileSession();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      const { nextProfile, nextUser } = await loadPopFileSnapshotWithRetry();

      if (isCurrent) {
        setUser(nextUser);
        setProfile(nextProfile);
        setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      isCurrent = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      profile,
      refreshProfile,
      setCachedProfile,
      signOut,
      user,
    }),
    [isLoading, profile, refreshProfile, setCachedProfile, signOut, user]
  );

  return (
    <PopFileContext.Provider value={value}>{children}</PopFileContext.Provider>
  );
}

export function usePopFile() {
  const context = useContext(PopFileContext);

  if (!context) {
    throw new Error("usePopFile must be used inside PopFileProvider.");
  }

  return context;
}
