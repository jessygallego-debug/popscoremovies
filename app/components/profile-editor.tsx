"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AvatarPicker from "@/app/components/avatar-picker";
import FavoriteGenreSelector from "@/app/components/favorite-genre-selector";
import { avatarForKey, genreLabelForKey } from "@/lib/profile-config";
import {
  consumeAuthRedirect,
  getCurrentUser,
  getProfileByUserId,
  normalizeUsername,
  ProfileRecord,
  sendMagicLink,
  signOut,
  SupabaseUser,
  upsertProfile,
} from "@/lib/profile-store";

export default function ProfileEditor() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState("");
  const [avatarKey, setAvatarKey] = useState("classic");
  const [favoriteGenre, setFavoriteGenre] = useState("horror");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const authError = consumeAuthRedirect();

    if (authError) {
      queueMicrotask(() => setMessage(authError));
    }

    getCurrentUser().then((nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        getProfileByUserId(nextUser.id).then((nextProfile) => {
          setProfile(nextProfile);
          setUsername(nextProfile?.username ?? "");
          setAvatarKey(nextProfile?.avatar_key ?? "classic");
          setFavoriteGenre(nextProfile?.favorite_genre ?? "horror");
        });
      }
    });
  }, []);

  if (!user) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
        <h1 className="text-3xl font-black text-white">Create Your Profile</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          Enter your email and PopScore will send you a sign-in link. After you
          open it, you can choose your username, avatar, and favorite genre.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage("");
            sendMagicLink(email)
              .then(() =>
                setMessage("Check your email for the PopScore sign-in link.")
              )
              .catch((error: Error) => setMessage(error.message));
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
          <button className="min-h-12 w-full rounded-xl bg-yellow-400 px-5 font-black text-black hover:bg-yellow-300">
            Send Sign-In Link
          </button>
        </form>
        {message ? <p className="mt-4 text-sm font-bold text-yellow-300">{message}</p> : null}
      </section>
    );
  }

  const avatar = avatarForKey(avatarKey);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-400">
            PopScore Profile
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            {profile ? "Edit Profile" : "Set Up Profile"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
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

      <form
        className="mt-8 space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          setIsSaving(true);
          setMessage("");
          upsertProfile({
            avatarKey,
            favoriteGenre,
            userId: user.id,
            username,
          })
            .then((nextProfile) => {
              setProfile(nextProfile);
              setUsername(nextProfile.username);
              setMessage("Profile saved.");
            })
            .catch((error: Error) => setMessage(error.message))
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
            value={username}
            onChange={(event) => setUsername(normalizeUsername(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-800 bg-black px-4 font-bold text-white outline-none focus:border-yellow-400"
          />
          <span className="mt-2 block text-xs font-bold text-slate-500">
            Use lowercase letters, numbers, or underscores.
          </span>
        </label>

        <div>
          <h2 className="mb-3 text-sm font-black uppercase text-yellow-400">
            Avatar
          </h2>
          <AvatarPicker value={avatarKey} onChange={setAvatarKey} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-black uppercase text-yellow-400">
            Favorite Genre
          </h2>
          <FavoriteGenreSelector
            value={favoriteGenre}
            onChange={setFavoriteGenre}
          />
        </div>

        <button
          disabled={isSaving}
          className="min-h-12 rounded-xl bg-yellow-400 px-6 font-black text-black hover:bg-yellow-300"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm font-bold text-yellow-300">{message}</p> : null}
      {profile ? (
        <Link
          href={`/profile/${profile.username}`}
          className="mt-5 inline-flex font-bold text-yellow-300 hover:text-yellow-200"
        >
          View public profile
        </Link>
      ) : null}
    </section>
  );
}
