create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists email_achievement_notifications boolean default true not null;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz default now() not null,
  email_sent_at timestamptz,
  created_at timestamptz default now() not null,

  constraint user_achievements_unique_unlock
    unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_unlocked_idx
on public.user_achievements (user_id, unlocked_at desc);

grant select on public.user_achievements to anon, authenticated;
grant insert, update on public.user_achievements to authenticated;

alter table public.user_achievements enable row level security;

drop policy if exists "Users can read their achievements" on public.user_achievements;
create policy "Users can read their achievements"
on public.user_achievements for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their achievement unlocks" on public.user_achievements;
create policy "Users can create their achievement unlocks"
on public.user_achievements for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their achievement unlocks" on public.user_achievements;
create policy "Users can update their achievement unlocks"
on public.user_achievements for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.community_discussion_replies (
  id text primary key,
  discussion_id text references public.community_discussions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text default '' not null,
  created_at timestamptz default now() not null,

  constraint community_discussion_replies_body_length
    check (char_length(body) <= 1200)
);

create index if not exists community_discussion_replies_discussion_created_idx
on public.community_discussion_replies (discussion_id, created_at);

grant select on public.community_discussion_replies to anon, authenticated;
grant insert on public.community_discussion_replies to authenticated;

alter table public.community_discussion_replies enable row level security;

drop policy if exists "Community discussion replies are public" on public.community_discussion_replies;
create policy "Community discussion replies are public"
on public.community_discussion_replies for select
using (true);

drop policy if exists "Users create their own community discussion replies" on public.community_discussion_replies;
create policy "Users create their own community discussion replies"
on public.community_discussion_replies for insert
with check (auth.uid() = user_id);
