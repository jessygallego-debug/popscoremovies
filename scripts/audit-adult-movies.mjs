// Read-only audit. Run with server-side Supabase and TMDB credentials in the environment.
// Prints only catalog movie IDs/classifications and aggregate counts, never user records.
const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.TMDB_API_TOKEN;
if (!base || !key || !token) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and TMDB_API_TOKEN are required.");
const refs = new Map();
const skipped = [];
function record(id, table) {
  if (!id) return;
  const sources = refs.get(String(id)) || new Set();
  sources.add(table);
  refs.set(String(id), sources);
}
const tables = ["movie_ratings", "ratings", "watchlist", "user_movie_watches", "community_discussions", "movie_rating_genre_votes", "movie_rating_genre_consensus", "monthly_watchlist_movies", "profiles"];
for (const table of tables) {
  const profile = table === "profiles";
  const order = profile ? "user_id" : table === "movie_rating_genre_votes" ? "user_id,movie_id" : table === "movie_rating_genre_consensus" ? "movie_id" : "id";
  for (let offset = 0; ; offset += 500) {
    const url = new URL(`/rest/v1/${table}`, base);
    url.search = new URLSearchParams({ select: profile ? "top_movies" : "movie_id", order, limit: "500", offset: String(offset) });
    const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (table === "ratings" && ["PGRST205", "42P01"].includes(error.code)) {
        skipped.push(table);
        break;
      }
      throw new Error(`Audit incomplete: ${table} returned HTTP ${response.status}.`);
    }
    const rows = await response.json();
    for (const row of rows) {
      if (profile) for (const movie of row.top_movies || []) record(movie.movieId, table);
      else record(row.movie_id, table);
    }
    if (rows.length < 500) break;
  }
}
const flagged = [];
const unresolved = [];
for (const [id, sources] of refs) {
  if (!/^[1-9]\d*$/.test(id)) { unresolved.push(id); continue; }
  const response = await fetch(`https://api.themoviedb.org/3/movie/${id}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) { unresolved.push(id); continue; }
  const movie = await response.json();
  if (movie.adult === true) flagged.push({ movieId: id, title: movie.title, tables: [...sources] });
  else if (movie.adult !== false) unresolved.push(id);
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), uniqueMovies: refs.size, skippedOptionalTables: skipped, flagged, unresolved }, null, 2));
if (unresolved.length) process.exitCode = 2;
