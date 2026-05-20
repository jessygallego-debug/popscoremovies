create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete cascade not null,
  actor_user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (
    type in (
      'follow',
      'comment_reply',
      'discussion_comment',
      'comment_reaction',
      'mention'
    )
  ),
  entity_type text not null check (
    entity_type in (
      'user_profile',
      'movie',
      'movie_comment',
      'discussion',
      'discussion_comment',
      'review'
    )
  ),
  entity_id text not null,
  message text not null,
  is_read boolean default false not null,
  created_at timestamptz default now() not null,
  constraint notifications_no_self_notification
    check (recipient_user_id <> actor_user_id)
);

create index if not exists notifications_recipient_created_idx
on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications for select
using (auth.uid() = recipient_user_id);

drop policy if exists "Users can create notifications as actor" on public.notifications;
create policy "Users can create notifications as actor"
on public.notifications for insert
with check (
  auth.uid() = actor_user_id
  and recipient_user_id <> actor_user_id
);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications for update
using (auth.uid() = recipient_user_id)
with check (auth.uid() = recipient_user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
on public.notifications for delete
using (auth.uid() = recipient_user_id);
