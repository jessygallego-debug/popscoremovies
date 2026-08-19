"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AvatarPicker from "@/app/components/avatar-picker";
import FavoriteGenreSelector from "@/app/components/favorite-genre-selector";
import { usePopFile } from "@/app/components/popfile-provider";
import {
  avatarForKey,
  firstUnlockedAvatarKey,
  genreLabelForKey,
  isAvatarUnlocked,
  safeProfileGenreKey,
} from "@/lib/profile-config";
import {
  consumeAuthRedirect,
  getCurrentUser,
  getProfileByUserId,
  getUserRatings,
  normalizeUsername,
  ProfileRecord,
  sendPasswordReset,
  sendUsernameReminder,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  SupabaseUser,
  updatePassword,
  upsertProfile,
  UserMovieRating,
} from "@/lib/profile-store";

function getSafeReturnPath(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  if (returnTo.startsWith("/profile/edit")) {
    return "/";
  }

  return returnTo;
}

function hasCompletedRating(rating: UserMovieRating) {
  return Boolean(
    rating.weights.length && rating.ratings && Object.keys(rating.ratings).length
  );
}

function getUniqueCompletedRatingCount(ratings: UserMovieRating[]) {
  return new Set(
    ratings.filter(hasCompletedRating).map((rating) => rating.movieId)
  ).size;
}

function ratingText(count: number) {
  return `${count} movie rating${count === 1 ? "" : "s"}`;
}

export default function ProfileEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCachedProfile } = usePopFile();
  const returnTo = getSafeReturnPath(searchParams.get("returnTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState("");
  const [avatarKey, setAvatarKey] = useState("clapper");
  const [favoriteGenre, setFavoriteGenre] = useState("horror");
  const [ratedMovieCount, setRatedMovieCount] = useState(0);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const authResult = consumeAuthRedirect();

    if (authResult.error) {
      queueMicrotask(() => setMessage(authResult.error));
    }

    if (authResult.isPasswordRecovery) {
      queueMicrotask(() => {
        setIsPasswordRecovery(true);
        setIsPasswordModalOpen(true);
        setMessage("Choose a new password to finish your reset.");
      });
    }

    getCurrentUser().then((nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        Promise.all([
          getProfileByUserId(nextUser.id),
          getUserRatings(nextUser.id),
        ]).then(([nextProfile, ratings]) => {
          const nextRatedMovieCount = getUniqueCompletedRatingCount(ratings);
          const nextAvatar = avatarForKey(
            nextProfile?.avatar_key ?? firstUnlockedAvatarKey(nextRatedMovieCount)
          );

          setProfile(nextProfile);
          setUsername(nextProfile?.username ?? "");
          setRatedMovieCount(nextRatedMovieCount);
          setAvatarKey(
            isAvatarUnlocked(nextAvatar.key, nextRatedMovieCount)
              ? nextAvatar.key
              : firstUnlockedAvatarKey(nextRatedMovieCount)
          );
          setFavoriteGenre(safeProfileGenreKey(nextProfile?.favorite_genre));

          if (authResult.signedIn && !authResult.isPasswordRecovery) {
            setMessage(
              nextProfile?.username
                ? `Signed in. Your PopFile username is @${nextProfile.username}.`
                : "Signed in. Set up your PopFile username here."
            );
          }
        });
      }
    });
  }, []);

  const requestPasswordReset = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter your email first, then tap Forgot password.");
      return;
    }

    setIsSendingRecovery(true);
    setMessage("");
    sendPasswordReset(trimmedEmail)
      .then(() =>
        setMessage(
          "Check your email for a password reset link. Open it, then choose a new password here."
        )
      )
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setIsSendingRecovery(false));
  };

  const requestUsernameReminder = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter your email first, then tap Forgot username.");
      return;
    }

    setIsSendingRecovery(true);
    setMessage("");
    sendUsernameReminder(trimmedEmail)
      .then(() =>
        setMessage(
          "If that email has a PopScore account, a secure sign-in link is on the way. Open it here and your username will show on this page."
        )
      )
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setIsSendingRecovery(false));
  };

  const saveNewPassword = () => {
    if (newPassword.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("The new passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setMessage("");
    updatePassword(newPassword)
      .then(() => {
        setNewPassword("");
        setConfirmPassword("");
        setIsPasswordRecovery(false);
        setIsPasswordModalOpen(false);
        setMessage("Password updated. Use it the next time you sign in.");
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setIsUpdatingPassword(false));
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
        <h1 className="text-3xl font-black text-white">Create Your PopFile</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          Sign in with your email and password. New here? Create an account,
          then choose your username, avatar, and favorite genre.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSigningIn(true);
            setMessage("");
            signInWithPassword(email.trim(), password)
              .then(() => getCurrentUser())
              .then((nextUser) => {
                if (!nextUser) {
                  window.location.reload();
                  return;
                }

                return getProfileByUserId(nextUser.id).then((nextProfile) => {
                  if (nextProfile) {
                    router.push(returnTo);
                    return;
                  }

                  window.location.reload();
                });
              })
              .catch((error: Error) => setMessage(error.message))
              .finally(() => setIsSigningIn(false));
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400"
          />
          <button
            disabled={isSigningIn}
            className="min-h-12 w-full rounded-xl bg-yellow-400 px-5 font-black text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? "Signing In..." : "Sign In"}
          </button>
          <button
            type="button"
            disabled={isSigningIn || isSendingRecovery}
            onClick={() => {
              if (!email.trim() || password.length < 8) {
                setMessage(
                  "Enter an email and a password with at least 8 characters."
                );
                return;
              }

              setIsSigningIn(true);
              setMessage("");
              signUpWithPassword(email.trim(), password)
                .then((signedIn) => {
                  if (signedIn) {
                    window.location.reload();
                    return;
                  }

                  setMessage(
                    "Account created. Check your email to confirm it, then sign in."
                  );
                })
                .catch((error: Error) => setMessage(error.message))
                .finally(() => setIsSigningIn(false));
            }}
            className="min-h-12 w-full rounded-xl border border-yellow-400/50 px-5 font-black text-yellow-300 transition hover:bg-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Account
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isSigningIn || isSendingRecovery}
              onClick={requestPasswordReset}
              className="min-h-12 rounded-xl border border-slate-700 px-5 font-black text-slate-200 transition hover:border-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Forgot Password?
            </button>
            <button
              type="button"
              disabled={isSigningIn || isSendingRecovery}
              onClick={requestUsernameReminder}
              className="min-h-12 rounded-xl border border-slate-700 px-5 font-black text-slate-200 transition hover:border-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Forgot Username?
            </button>
          </div>
        </form>
        {message ? (
          <p className="mt-4 text-sm font-bold text-yellow-300">{message}</p>
        ) : null}
      </section>
    );
  }

  const avatar = avatarForKey(avatarKey);
  const usernameLocked = Boolean(profile);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-400">
            PopScore PopFile
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            {profile ? "Edit PopFile" : "Set Up PopFile"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
            setCachedProfile(null);
            window.location.reload();
          }}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
        >
          Sign Out
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-3xl">
            {avatar.icon}
          </span>
          <div>
            <p className="font-black text-white">{username || "username"}</p>
            <p className="text-sm font-bold text-slate-400">
              Favorite genre: {genreLabelForKey(favoriteGenre)}
            </p>
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-yellow-400/20 bg-black/40 p-4 text-sm font-bold text-yellow-300">
          {message}
        </p>
      ) : null}

      <form
        className="mt-8 space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          const selectedAvatar = avatarForKey(avatarKey);

          if (!isAvatarUnlocked(selectedAvatar.key, ratedMovieCount)) {
            setAvatarKey(firstUnlockedAvatarKey(ratedMovieCount));
            setMessage(
              `${selectedAvatar.label} needs ${ratingText(
                Math.max(selectedAvatar.unlockAt - ratedMovieCount, 0)
              )} more to unlock.`
            );
            return;
          }

          setIsSaving(true);
          setMessage("");
          upsertProfile({
            avatarKey: selectedAvatar.key,
            favoriteGenre,
            userId: user.id,
            username,
          })
            .then((nextProfile) => {
              setProfile(nextProfile);
              setCachedProfile(nextProfile);
              setUsername(nextProfile.username);
              setMessage("PopFile saved.");
            })
            .catch((error: Error) => {
              if (process.env.NODE_ENV !== "production") {
                console.error("Save PopFile failed", error);
              }

              setMessage(error.message);
            })
            .finally(() => setIsSaving(false));
        }}
      >
        <label className="block">
          <span className="text-sm font-black uppercase text-yellow-400">
            Username
          </span>
          <input
            required
            minLength={3}
            maxLength={24}
            disabled={usernameLocked}
            value={username}
            onChange={(event) => setUsername(normalizeUsername(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
          />
          <span className="mt-2 block text-xs font-bold text-slate-500">
            {usernameLocked
              ? "Your username is connected to your email and cannot be changed."
              : "Use lowercase letters, numbers, or underscores. Usernames must be unique and clean."}
          </span>
        </label>

        <div>
          <h2 className="mb-3 text-sm font-black uppercase text-yellow-400">
            Avatar
          </h2>
          <AvatarPicker
            ratedMovieCount={ratedMovieCount}
            value={avatarKey}
            onChange={setAvatarKey}
          />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-black uppercase text-yellow-400">
            Favorite Genre
          </h2>
          <FavoriteGenreSelector
            value={favoriteGenre}
            onChange={setFavoriteGenre}
          />
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="mt-4 inline-flex font-bold text-yellow-300 underline underline-offset-4 transition hover:text-yellow-200"
          >
            Set New Password
          </button>
        </div>

        <button
          disabled={isSaving}
          className="min-h-12 rounded-xl bg-yellow-400 px-6 font-black text-black hover:bg-yellow-300"
        >
          {isSaving ? "Saving..." : "Save PopFile"}
        </button>
      </form>

      {profile ? (
        <Link
          href={`/profile/${profile.username}`}
          className="mt-5 inline-flex font-bold text-yellow-300 hover:text-yellow-200"
        >
          View public PopFile
        </Link>
      ) : null}

      {isPasswordModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-new-password-title"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm"
          onMouseDown={() => {
            if (!isUpdatingPassword) {
              setIsPasswordModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl shadow-black/70"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">
                  PopFile
                </p>
                <h2
                  id="set-new-password-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  Set New Password
                </h2>
              </div>
              <button
                type="button"
                disabled={isUpdatingPassword}
                aria-label="Close password popup"
                onClick={() => setIsPasswordModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                X
              </button>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
              {isPasswordRecovery
                ? "Choose a new password to finish your reset."
                : "Enter and confirm your new password."}
            </p>

            <div className="mt-5 grid gap-3">
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                className="min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400"
              />
              <input
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400"
              />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isUpdatingPassword}
                onClick={() => setIsPasswordModalOpen(false)}
                className="min-h-12 rounded-xl border border-slate-700 px-5 font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingPassword}
                onClick={saveNewPassword}
                className="min-h-12 rounded-xl bg-yellow-400 px-5 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingPassword ? "Saving Password..." : "Save New Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
