"use client";

import { useEffect, useState } from "react";
import MovieGrid from "@/app/components/movie-grid";
import { MOVIE_GENRE_FILTERS, type MovieSummary } from "@/lib/tmdb";
import { MOVIE_REGION_OPTIONS } from "@/lib/movie-locale";

import { groupStreamingProviders, type StreamingProvider as Provider } from "@/lib/streaming-providers";
const storageKey = "popscore.streaming.v1";
const selectClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white";
const genres = MOVIE_GENRE_FILTERS.filter(genre => /^\d+$/.test(genre.id));

export default function StreamingBrowser() {
  const [country, setCountry] = useState("US");
  const [services, setServices] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerCountry, setProviderCountry] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [movieSearch, setMovieSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const serviceKey = services.join(",");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && MOVIE_REGION_OPTIONS.some(option => option.value === saved.country && saved.country)) {
        // Restore browser preferences after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCountry(saved.country);
        if (Array.isArray(saved.services)) setServices(saved.services.filter((id: unknown) => typeof id === "string" && /^\d+$/.test(id)).slice(0, 50));
      }
    } catch { /* Storage may be disabled. Browsing still works. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ country, services })); } catch { /* Optional persistence. */ }
  }, [country, services, ready]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    // Reset request status when synchronizing with a new external catalog.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProviderError("");
    setProviderCountry("");
    fetch(`/api/streaming?mode=providers&country=${country}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        const groupedProviders = groupStreamingProviders(data.providers);
        setProviders(groupedProviders);
        setServices(current => [...new Set(current.flatMap(id => {
          const provider = groupedProviders.find(provider => provider.provider_ids?.includes(Number(id)));
          return provider ? [String(provider.provider_id)] : [];
        }))]);
        setProviderCountry(country);
      }).catch(err => { if (!controller.signal.aborted) setProviderError(err.message); });
    return () => controller.abort();
  }, [country, ready, retry]);

  useEffect(() => {
    // Clear the previous external result while the replacement request is pending.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMovies([]);
    setTotalPages(0);
    setError("");
    if (!ready || providerCountry !== country || !serviceKey) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ country, services: serviceKey, genre, query, page: String(page) });
    fetch(`/api/streaming?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        setMovies(data.movies);
        setTotalPages(data.totalPages);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [country, serviceKey, genre, query, page, ready, providerCountry, retry]);

  function toggleService(id: string) {
    setServices(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    setPage(1);
  }

  return <div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="text-sm font-bold">Country
          <select aria-label="Country" className={selectClass} value={country} disabled={!ready} onChange={event => { setCountry(event.target.value); setServices([]); setPage(1); setSearch(""); }}>
            {MOVIE_REGION_OPTIONS.filter(option => option.value).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Genre
          <select aria-label="Genre" className={selectClass} value={genre} onChange={event => { setGenre(event.target.value); setPage(1); }}>
            <option value="">All genres</option>{genres.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <form onSubmit={event => { event.preventDefault(); setQuery(movieSearch.trim()); setPage(1); }} className="text-sm font-bold">
          <label htmlFor="streaming-movie-search">Search movies</label>
          <div className="flex items-center gap-2">
            <input id="streaming-movie-search" type="search" maxLength={100} minLength={2} className={selectClass} value={movieSearch} placeholder="Search your services’ catalogs"
              onChange={event => { setMovieSearch(event.target.value); if (!event.target.value) { setQuery(""); setPage(1); } }} />
            <button type="submit" className="mt-2 rounded-xl border border-yellow-400/50 px-3 py-3 text-yellow-300">Search</button>
          </div>
        </form>
      </div>
      <p className="mt-3 text-xs text-slate-400">Your country and services are saved in this browser.</p>
      <fieldset className="mt-6">
        <legend className="text-xl font-bold">Choose Your Streaming Services</legend>
        <p className="mt-2 text-sm text-slate-300">Select one or more. Movies included with any selected subscription will appear below.</p>
        {providerError ? <p role="alert" className="mt-4 text-amber-300">{providerError}</p> : providerCountry !== country ? <p role="status" className="mt-4 text-slate-300">Loading services…</p> : <>
          <label className="mt-4 block max-w-md text-sm font-bold">Find a service
            <input type="search" className={selectClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search streaming services" />
          </label>
          <div className="mt-4 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {providers.filter(provider => provider.provider_name.toLowerCase().includes(search.toLowerCase())).map(provider => {
              const id = String(provider.provider_id);
              return <button type="button" key={id} aria-pressed={services.includes(id)} onClick={() => toggleService(id)}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${services.includes(id) ? "border-yellow-400 bg-yellow-400/15 text-yellow-300" : "border-slate-700 bg-slate-950 text-slate-200 hover:border-yellow-400/60"}`}>{provider.provider_name}</button>;
            })}
          </div>
          {!providers.some(provider => provider.provider_name.toLowerCase().includes(search.toLowerCase())) && <p className="mt-3 text-sm text-slate-400">No services found.</p>}
          {services.length > 0 && <button type="button" onClick={() => { setServices([]); setPage(1); }} className="mt-4 text-sm font-bold text-yellow-300">Clear selected services ({services.length})</button>}
        </>}
      </fieldset>
    </div>
    <div className="mt-8" aria-busy={loading}>
      <h2 className="mb-4 text-2xl font-black">Movies on Your Services</h2>
      {providerError || error ? <div>{error && <p role="alert" className="text-amber-300">{error}</p>}<button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 rounded-xl border border-yellow-400 px-4 py-2 font-bold text-yellow-300">Try again</button></div>
        : loading ? <p role="status" className="text-slate-300">Finding streaming movies…</p>
        : !services.length ? <p role="status" className="text-slate-300">Choose your services to see what’s streaming.</p>
        : providerCountry === country && !movies.length ? <p role="status" className="text-slate-300">No subscription movies match these selections. Try another service, genre, or movie title.</p>
        : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"><MovieGrid movies={movies} returnTo="/streaming" /></div>}
      {!loading && !error && totalPages > 1 && <nav aria-label="Streaming movie pages" className="mt-6 flex items-center justify-center gap-4">
        <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-xl border border-slate-700 px-4 py-3 disabled:opacity-40">Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="rounded-xl border border-slate-700 px-4 py-3 disabled:opacity-40">Next</button>
      </nav>}
    </div>
  </div>;
}
