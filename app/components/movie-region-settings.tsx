"use client";

import { useState } from "react";
import { usePopFile } from "./popfile-provider";
import { movieRegionOptionsWithSelection } from "@/lib/movie-locale";
import { fixedMovieRegion } from "@/lib/movie-region";
import { updateProfileDiscoveryPreferences } from "@/lib/profile-store";

function RegionForm({ initialRegion }: { initialRegion: string }) {
  const { setCachedProfile } = usePopFile();
  const [draftRegion, setRegion] = useState<string | null>(null);
  const region = draftRegion ?? initialRegion;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form className="mt-8 rounded-2xl border border-slate-800 bg-black/35 p-5" onSubmit={async event => {
      event.preventDefault();
      setSaving(true);
      setMessage("");
      try {
        const profile = await updateProfileDiscoveryPreferences({ preferredMovieRegion: region || null });
        if (!profile) throw new Error("Sign in to save your movie region.");
        setCachedProfile(profile);
        setRegion(null);
        setMessage("Movie region saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save your movie region. Please try again.");
      } finally {
        setSaving(false);
      }
    }}>
      <h2 className="text-lg font-black text-yellow-300">Movie settings</h2>
      <label className="mt-4 block">
        <span className="font-bold text-white">Movie region</span>
        <select value={region} onChange={event => { setRegion(event.target.value); setMessage(""); }} disabled={saving}
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-black px-3 font-bold text-white focus:border-yellow-400">
          <option value="">Automatic — current location</option>
          {movieRegionOptionsWithSelection(region).filter(option => option.value).map(option =>
            <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <p className="mt-3 text-sm leading-6 text-slate-400">Choose the country used for homepage movies and Where to Watch. Automatic follows your current location when you travel. A selected country stays fixed.</p>
      <button disabled={saving} className="mt-4 min-h-11 rounded-xl bg-yellow-400 px-5 font-black text-black disabled:opacity-60">
        {saving ? "Saving…" : "Save movie region"}
      </button>
      <p role="status" className="mt-3 text-sm font-bold text-yellow-300">{message}</p>
    </form>
  );
}

export default function MovieRegionSettings() {
  const { profile } = usePopFile();
  if (!profile) return null;
  const region = fixedMovieRegion(profile.preferred_movie_region);
  return <RegionForm key={profile.user_id} initialRegion={region} />;
}
