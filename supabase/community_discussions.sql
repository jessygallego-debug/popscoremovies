create extension if not exists pgcrypto;

create table if not exists public.community_discussions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_id text not null,
  movie_title text not null,
  movie_year text default '' not null,
  movie_poster_url text,
  movie_genres text[] default '{}'::text[] not null,
  title text not null,
  body text default '' not null,
  type text not null check (
    type in (
      'Question',
      'Debate',
      'Theory',
      'Ending Explained',
      'Hot Take',
      'Recommendation'
    )
  ),
  tags text[] default '{}'::text[] not null,
  is_spoiler boolean default false not null,
  comment_count integer default 0 not null check (comment_count >= 0),
  like_count integer default 0 not null check (like_count >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_active_at timestamptz default now() not null,
  constraint community_discussions_title_length
    check (char_length(title) between 1 and 160),
  constraint community_discussions_body_length
    check (char_length(body) <= 1200)
);

create index if not exists community_discussions_last_active_idx
on public.community_discussions (last_active_at desc);

create index if not exists community_discussions_movie_idx
on public.community_discussions (movie_id);

create index if not exists community_discussions_user_created_idx
on public.community_discussions (user_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant select on public.community_discussions to anon, authenticated;
grant insert, update, delete on public.community_discussions to authenticated;

alter table public.community_discussions enable row level security;

drop policy if exists "Community discussions are public" on public.community_discussions;
create policy "Community discussions are public"
on public.community_discussions for select
using (true);

drop policy if exists "Users create their own community discussions" on public.community_discussions;
create policy "Users create their own community discussions"
on public.community_discussions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own community discussions" on public.community_discussions;
create policy "Users update their own community discussions"
on public.community_discussions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own community discussions" on public.community_discussions;
create policy "Users delete their own community discussions"
on public.community_discussions for delete
using (auth.uid() = user_id);

create or replace function public.popscore_touch_community_discussion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.last_active_at = coalesce(new.last_active_at, now());
  return new;
end;
$$;

drop trigger if exists community_discussions_touch_updated_at
on public.community_discussions;
create trigger community_discussions_touch_updated_at
before update on public.community_discussions
for each row execute function public.popscore_touch_community_discussion();
