create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists email_new_follower_notifications boolean default true not null;

create table if not exists public.new_follower_email_events (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,

  constraint new_follower_email_events_unique_follow
    unique (follower_id, following_id),
  constraint new_follower_email_events_no_self_follow
    check (follower_id <> following_id)
);

create index if not exists new_follower_email_events_following_idx
on public.new_follower_email_events (following_id, created_at desc);

grant select, insert on public.new_follower_email_events to authenticated;

alter table public.new_follower_email_events enable row level security;

drop policy if exists "Users can read their follower email events" on public.new_follower_email_events;
create policy "Users can read their follower email events"
on public.new_follower_email_events for select
using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Users can create their follower email events" on public.new_follower_email_events;
create policy "Users can create their follower email events"
on public.new_follower_email_events for insert
with check (auth.uid() = follower_id);
