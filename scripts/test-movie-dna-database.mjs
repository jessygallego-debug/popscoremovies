import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const migration = readFileSync("supabase/migrations/20261007120224_movie_dna_history.sql", "utf8");
const owner = "00000000-0000-0000-0000-000000000001", other = "00000000-0000-0000-0000-000000000002";
// Run the same reproducible migration and security suite in two clean databases.
for (const environment of ["clean", "preview-equivalent"]) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;`);
  await db.exec(migration);
  await db.query("insert into auth.users values ($1), ($2)", [owner, other]);
  const hash = n => String(n).padStart(64, "0");
  async function assume(role, user = "") {
    await db.exec(`reset role; set role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  }
  async function insert(user, personality = "The Rewatcher") {
    await db.query(`insert into public.movie_dna_snapshots (user_id, personality, confidence, rating_count, input_fingerprint, algorithm_version)
      values ($1, $2, 0.6, 40, $3, 2)`, [user, personality, hash(1)]);
  }
  await assume("anon");
  await assert.rejects(() => db.query("select * from public.movie_dna_snapshots"), /permission denied/);
  await assert.rejects(() => insert(owner), /permission denied/);
  await assert.rejects(() => db.query("update public.movie_dna_snapshots set personality='x'"), /permission denied/);
  await assert.rejects(() => db.query("delete from public.movie_dna_snapshots"), /permission denied/);
  await assume("authenticated", owner);
  await insert(owner);
  assert.equal((await db.query("select * from public.movie_dna_snapshots")).rows.length, 1);
  await assert.rejects(() => insert(other), /row-level security/);
  await assert.rejects(() => db.query("delete from public.movie_dna_snapshots"), /permission denied/);
  await assert.rejects(() => db.query("update public.movie_dna_snapshots set previous_personality='Fake'"), /permission denied/);
  await assert.rejects(() => db.query("update public.movie_dna_snapshots set user_id=$1", [other]), /permission denied/);
  await db.query("update public.movie_dna_snapshots set personality='The Horror Devotee', confidence=0.7, rating_count=75, input_fingerprint=$1", [hash(2)]);
  let row = (await db.query("select * from public.movie_dna_snapshots")).rows[0];
  assert.equal(row.previous_personality, "The Rewatcher");
  assert.equal(row.personality, "The Horror Devotee");
  const changedAt = row.personality_changed_at;
  await db.query("update public.movie_dna_snapshots set personality=null, confidence=0.1, input_fingerprint=$1", [hash(3)]);
  row = (await db.query("select * from public.movie_dna_snapshots")).rows[0];
  assert.equal(row.personality, "The Horror Devotee");
  assert.equal(row.previous_personality, "The Rewatcher");
  assert.equal(String(row.personality_changed_at), String(changedAt));
  await db.query("update public.movie_dna_snapshots set personality='Story Seeker', confidence=0.1, input_fingerprint=$1", [hash(4)]);
  assert.equal((await db.query("select personality from public.movie_dna_snapshots")).rows[0].personality, "The Horror Devotee");
  await assume("authenticated", other);
  assert.equal((await db.query("select * from public.movie_dna_snapshots")).rows.length, 0);
  assert.equal((await db.query("update public.movie_dna_snapshots set personality='Fake' where user_id=$1 returning user_id", [owner])).rows.length, 0);
  await insert(other, "The Laugh Seeker");
  await assume("service_role");
  assert.equal((await db.query("select * from public.movie_dna_snapshots")).rows.length, 2);
  await assume("postgres");
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.movie_dna_snapshots'::regclass")).rows[0].relrowsecurity, true);
  assert.equal((await db.query("select prosecdef from pg_proc where oid='public.track_movie_dna_change()'::regprocedure")).rows[0].prosecdef, false);
  await db.close();
  console.log(`${environment}: migration, owner writes, atomic history, anon denial, cross-user denial, protected history and service reads passed`);
}
