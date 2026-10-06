import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text);
create table public.profiles(id uuid primary key,user_id uuid,email_monthly_watchlist boolean);
grant usage on schema public to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
create table public.monthly_watchlist_suppressions(email text primary key);`);
await db.exec(
  readFileSync(
    "supabase/migrations/20261003233522_monthly_watchlist_production_setup.sql",
    "utf8",
  ),
);
await db.exec(
  `insert into public.monthly_watchlists(month_key,month,year,subject,preview_text) values('2026-10-01',10,2026,'Existing','Keep me');`,
);
await db.exec(
  readFileSync(
    "supabase/migrations/20261006082822_automated_movie_releases.sql",
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    "supabase/migrations/20261006084812_atomic_release_campaigns.sql",
    "utf8",
  ),
);
await db.exec(readFileSync("supabase/migrations/20261006085532_release_collection_least_privilege.sql", "utf8"));
assert.equal(
  (await db.query("select subject from public.monthly_watchlists")).rows[0]
    .subject,
  "Existing",
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  await assert.rejects(
    db.exec("select public.claim_release_collection('{}')"),
    /permission denied/,
  );
  await assert.rejects(
    db.exec(
      "select public.save_release_campaign('2026-11-01','[]',false,'Test','Test')",
    ),
    /permission denied/,
  );
  for (const sql of [
    "select * from public.movie_release_events",
    "insert into public.streaming_providers values('evil','Evil',array[1],true)",
    "update public.streaming_providers set enabled=false",
    "select * from public.upcoming_streaming_releases",
  ])
    await assert.rejects(db.exec(sql), /permission denied/);
  await db.exec("reset role");
}
await db.exec("set role service_role");
const claimed = (
  await db.query("select public.claim_release_collection('{}') id")
).rows[0].id;
assert.ok(claimed);
assert.equal(
  (await db.query("select public.claim_release_collection('{}') id")).rows[0]
    .id,
  null,
);
await db.exec(`insert into public.release_movie_metadata(tmdb_id,title,verified_at) values(1,'Test',now());
insert into public.movie_release_events(tmdb_id,release_type,announced_release_date,source_id,source_event_key,source_url,confidence,verified_at) values(1,'digital','2026-11-01','tmdb','1:digital:2026-11-01','https://example.com','MEDIUM',now());`);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from public.movie_release_events",
    )
  ).rows[0].count,
  1,
);
const pick = {
  movieId: "1",
  movieTitle: "Test",
  posterPath: "/poster",
  category: "digital",
  releaseDate: "2026-11-04",
  provider: null,
  availabilityType: "rent_buy",
  rankingScore: 100,
  displayOrder: 1,
  sourceUrl: "https://example.com",
  verifiedAt: new Date().toISOString(),
};
await db.query(
  "select public.save_release_campaign($1,$2,false,'Test','Preview')",
  ["2026-11-01", JSON.stringify([pick])],
);
await assert.rejects(
  db.query(
    "select public.save_release_campaign($1,$2,false,'Broken','Preview')",
    ["2026-11-01", JSON.stringify([{ ...pick, releaseDate: "2026-12-01" }])],
  ),
  /outside campaign/,
);
assert.equal(
  (await db.query("select movie_title from public.monthly_watchlist_movies"))
    .rows[0].movie_title,
  "Test",
);
await db.exec(
  "update public.monthly_watchlists set status='sent' where month_key='2026-11-01'",
);
await assert.rejects(
  db.query(
    "select public.save_release_campaign($1,$2,false,'Broken','Preview')",
    ["2026-11-01", JSON.stringify([pick])],
  ),
  /locked/,
);
await assert.rejects(
  db.exec("delete from public.movie_release_events"),
  /permission denied/,
);
await assert.rejects(
  db.exec(
    "insert into public.movie_release_events(tmdb_id,release_type,source_id,source_event_key,source_url,confidence,verified_at) values(1,'digital','tmdb','missing','https://example.com','MEDIUM',now())",
  ),
  /check constraint/,
);
console.log(
  "Release migration: preserved campaign, service allow/deny, anonymous/authenticated deny checks passed.",
);
await db.close();
