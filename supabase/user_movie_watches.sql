create extension if not exists pgcrypto;

alter table public.movie_ratings
add column if not exists rating_source text;

alter table public.movie_ratings
drop constraint if exists movie_ratings_rating_source_valid;

alter table public.movie_ratings
add constraint movie_ratings_rating_source_valid
check (
  rating_source is null or
  rating_source in ('movie_match', 'onboarding', 'bulk', 'imported')
);

create table if not exists public.user_movie_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_id text not null,
  watched_date date,
  watch_type text default 'first_watch' not null,
  rating_id uuid references public.movie_ratings(id) on delete set null,
  runtime_minutes integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint user_movie_watches_type_valid
    check (watch_type in ('first_watch', 'rewatch', 'historical', 'imported')),
  constraint user_movie_watches_runtime_valid
    check (runtime_minutes is null or runtime_minutes > 0)
);

create index if not exists user_movie_watches_user_date_idx
on public.user_movie_watches (user_id, watched_date desc, created_at desc);

create index if not exists user_movie_watches_user_movie_idx
on public.user_movie_watches (user_id, movie_id, created_at desc);

create index if not exists user_movie_watches_rating_idx
on public.user_movie_watches (rating_id);

create or replace function public.set_user_movie_watch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_movie_watches_set_updated_at on public.user_movie_watches;
create trigger user_movie_watches_set_updated_at
before update on public.user_movie_watches
for each row execute function public.set_user_movie_watch_updated_at();

alter table public.user_movie_watches enable row level security;

drop policy if exists "Movie watches are public" on public.user_movie_watches;
create policy "Movie watches are public"
on public.user_movie_watches for select
using (true);

drop policy if exists "Users create their own movie watches" on public.user_movie_watches;
create policy "Users create their own movie watches"
on public.user_movie_watches for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own movie watches" on public.user_movie_watches;
create policy "Users update their own movie watches"
on public.user_movie_watches for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own movie watches" on public.user_movie_watches;
create policy "Users delete their own movie watches"
on public.user_movie_watches for delete
using (auth.uid() = user_id);

-- Existing ratings are intentionally not backfilled. Their creation date does
-- not prove when the movie was watched and would inflate current-year totals.
