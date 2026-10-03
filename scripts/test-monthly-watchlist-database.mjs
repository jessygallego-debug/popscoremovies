// Install @electric-sql/pglite, or set PGLITE_MODULE to an existing module's file URL.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const sql = readFileSync('supabase/migrations/20261003233522_monthly_watchlist_production_setup.sql', 'utf8');
for (const existingSuppression of [false, true]) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create table public.profiles(user_id uuid primary key references auth.users(id));
    grant usage on schema public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    insert into auth.users values ('00000000-0000-0000-0000-000000000001','suppressed@example.test');
    insert into public.profiles values ('00000000-0000-0000-0000-000000000001');`);
  if (existingSuppression) {
    await db.exec(`create table public.monthly_watchlist_suppressions(email text primary key, reason text not null,
      provider text default 'resend' not null, created_at timestamptz default now() not null, updated_at timestamptz default now() not null);
      alter table public.monthly_watchlist_suppressions enable row level security;
      revoke all on public.monthly_watchlist_suppressions from anon,authenticated;
      insert into public.monthly_watchlist_suppressions(email,reason) values('suppressed@example.test','bounce');`);
  }
  await db.exec(sql);
  await db.exec(sql);
  assert.equal((await db.query('select email_monthly_watchlist from profiles')).rows[0].email_monthly_watchlist, !existingSuppression);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    for (const table of ['monthly_watchlists','monthly_watchlist_movies','monthly_watchlist_recipients','monthly_watchlist_suppressions']) {
      for (const query of [`select * from ${table}`, `delete from ${table}`, `insert into ${table} default values`]) {
        await assert.rejects(db.exec(query), /permission denied/);
      }
    }
    await assert.rejects(db.exec("update monthly_watchlists set status='sent'"), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec(`set role service_role;
    insert into monthly_watchlists(id,month_key,month,year,subject,preview_text)
    values('00000000-0000-0000-0000-000000000002','2026-10-01',10,2026,'Test','Test');
    update monthly_watchlists set status='ready';
    insert into monthly_watchlist_recipients(watchlist_id,user_id,email)
    values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','suppressed@example.test');
    update monthly_watchlist_recipients set status='skipped';`);
  assert.equal((await db.query('select status from monthly_watchlists')).rows[0].status, 'ready');
  await assert.rejects(db.exec('delete from monthly_watchlists'), /permission denied/);
  await assert.rejects(db.exec('delete from monthly_watchlist_recipients'), /permission denied/);
  await db.close();
}
console.log('PASS: clean and partial setup, reruns, suppression preservation, browser access denied, backend campaign/recipient writes, unnecessary deletes denied.');
