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
  SupabaseUser,
} from "@/lib/profile-store";

type PopFileContextValue = {
  isLoading: boolean;
  profile: ProfileRecord | null;
  refreshProfile: () => Promise<ProfileRecord | null>;
  setCachedProfile: (profile: ProfileRecord | null) => void;
  user: SupabaseUser | null;
};

const PopFileContext = createContext<PopFileContextValue | null>(null);

export function PopFileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);

    const nextUser = await getCurrentUser().catch(() => null);
    const nextProfile = nextUser
      ? await getProfileByUserId(nextUser.id).catch(() => null)
      : null;

    setUser(nextUser);
    setProfile(nextProfile);
    setIsLoading(false);

    return nextProfile;
  }, []);

  const setCachedProfile = useCallback((nextProfile: ProfileRecord | null) => {
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      const nextUser = await getCurrentUser().catch(() => null);
      const nextProfile = nextUser
        ? await getProfileByUserId(nextUser.id).catch(() => null)
        : null;

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
      user,
    }),
    [isLoading, profile, refreshProfile, setCachedProfile, user]
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
