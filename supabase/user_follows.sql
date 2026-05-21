create extension if not exists pgcrypto;

create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,

  constraint unique_follow unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists user_follows_follower_idx
on public.user_follows (follower_id, created_at desc);

create index if not exists user_follows_following_idx
on public.user_follows (following_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant select on public.user_follows to anon, authenticated;
grant insert, delete on public.user_follows to authenticated;

alter table public.user_follows enable row level security;

drop policy if exists "Anyone can read follow relationships" on public.user_follows;
create policy "Anyone can read follow relationships"
on public.user_follows for select
using (true);

drop policy if exists "Users can follow as themselves" on public.user_follows;
create policy "Users can follow as themselves"
on public.user_follows for insert
with check (
  auth.uid() = follower_id
  and follower_id <> following_id
);

drop policy if exists "Users can unfollow as themselves" on public.user_follows;
create policy "Users can unfollow as themselves"
on public.user_follows for delete
using (auth.uid() = follower_id);

do $$
begin
  if to_regclass('public.notifications') is not null then
    alter table public.notifications
      drop constraint if exists notifications_type_check;

    alter table public.notifications
      add constraint notifications_type_check
      check (
        type in (
          'follow',
          'new_follower',
          'comment_reply',
          'discussion_comment',
          'comment_reaction',
          'mention'
        )
      );
  end if;
end $$;
