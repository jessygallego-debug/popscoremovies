create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  username text unique not null,
  avatar_key text not null,
  favorite_genre text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint username_url_safe check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.movie_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_id text not null,
  movie_title text not null,
  poster_path text,
  release_date text,
  genre text not null,
  genre_names text[] default '{}'::text[] not null,
  ratings jsonb default '{}'::jsonb not null,
  weights jsonb default '[]'::jsonb not null,
  story_score int,
  acting_score int,
  rewatchability_score int,
  scare_factor_score int,
  originality_score int,
  visual_effects_score int,
  action_sequences_score int,
  pace_score int,
  chemistry_score int,
  humor_score int,
  popscore numeric not null,
  quick_reaction text check (quick_reaction in ('loved_it', 'worth_watching', 'trash')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, movie_id)
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_id text not null,
  movie_title text not null,
  poster_path text,
  release_date text,
  genre text,
  genre_names text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null,
  unique(user_id, movie_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists movie_ratings_set_updated_at on public.movie_ratings;
create trigger movie_ratings_set_updated_at
before update on public.movie_ratings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.movie_ratings enable row level security;
alter table public.watchlist enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public"
on public.profiles for select
using (true);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Ratings are public" on public.movie_ratings;
create policy "Ratings are public"
on public.movie_ratings for select
using (true);

drop policy if exists "Users create their own ratings" on public.movie_ratings;
create policy "Users create their own ratings"
on public.movie_ratings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own ratings" on public.movie_ratings;
create policy "Users update their own ratings"
on public.movie_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Watchlists are public" on public.watchlist;
create policy "Watchlists are public"
on public.watchlist for select
using (true);

drop policy if exists "Users create their own watchlist" on public.watchlist;
create policy "Users create their own watchlist"
on public.watchlist for insert
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own watchlist" on public.watchlist;
create policy "Users delete their own watchlist"
on public.watchlist for delete
using (auth.uid() = user_id);
