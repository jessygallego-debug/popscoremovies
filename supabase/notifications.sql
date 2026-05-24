create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete cascade not null,
  actor_user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (
    type in (
      'follow',
      'new_follower',
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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.notifications to anon;

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

create or replace function public.popscore_notification_display_name(
  input_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select profiles.username
      from public.profiles
      where profiles.user_id = input_user_id
      limit 1
    ),
    'Someone'
  );
$$;

create or replace function public.popscore_notification_profile_slug(
  input_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select profiles.username
      from public.profiles
      where profiles.user_id = input_user_id
      limit 1
    ),
    input_user_id::text
  );
$$;

create or replace function public.popscore_insert_notification(
  input_recipient_user_id uuid,
  input_actor_user_id uuid,
  input_type text,
  input_entity_type text,
  input_entity_id text,
  input_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if input_recipient_user_id is null
    or input_actor_user_id is null
    or input_recipient_user_id = input_actor_user_id then
    return;
  end if;

  if exists (
    select 1
    from public.notifications
    where recipient_user_id = input_recipient_user_id
      and actor_user_id = input_actor_user_id
      and type = input_type
      and entity_type = input_entity_type
      and entity_id = input_entity_id
      and created_at > now() - interval '30 seconds'
    limit 1
  ) then
    return;
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    type,
    entity_type,
    entity_id,
    message
  ) values (
    input_recipient_user_id,
    input_actor_user_id,
    input_type,
    input_entity_type,
    input_entity_id,
    input_message
  );
exception
  when check_violation or foreign_key_violation then
    return;
end;
$$;

create or replace function public.popscore_skip_duplicate_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.notifications
    where recipient_user_id = new.recipient_user_id
      and actor_user_id = new.actor_user_id
      and type = new.type
      and entity_type = new.entity_type
      and entity_id = new.entity_id
      and created_at > now() - interval '30 seconds'
    limit 1
  ) then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_skip_duplicate_recent on public.notifications;
create trigger notifications_skip_duplicate_recent
before insert on public.notifications
for each row execute function public.popscore_skip_duplicate_notification();

create or replace function public.popscore_notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  actor_slug text;
begin
  actor_name := public.popscore_notification_display_name(new.follower_id);
  actor_slug := public.popscore_notification_profile_slug(new.follower_id);

  perform public.popscore_insert_notification(
    new.following_id,
    new.follower_id,
    'new_follower',
    'user_profile',
    actor_slug,
    actor_name || ' started following you.'
  );

  return new;
end;
$$;

create or replace function public.popscore_notify_community_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  movie_owner_id uuid;
  movie_id text;
  movie_title text;
begin
  actor_name := public.popscore_notification_display_name(new.user_id);

  if new.post_id like 'rating-%' then
    select movie_ratings.user_id, movie_ratings.movie_id, movie_ratings.movie_title
    into movie_owner_id, movie_id, movie_title
    from public.movie_ratings
    where movie_ratings.id::text = replace(new.post_id, 'rating-', '')
    limit 1;

    if movie_owner_id is not null then
      perform public.popscore_insert_notification(
        movie_owner_id,
        new.user_id,
        'comment_reply',
        'movie',
        '/community#post-' || new.post_id,
        actor_name || ' commented on your post' ||
          case when movie_title is not null then ' on ' || movie_title else '' end ||
          '.'
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.popscore_notify_community_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  movie_owner_id uuid;
  movie_id text;
  movie_title text;
begin
  actor_name := public.popscore_notification_display_name(new.user_id);

  if new.post_id like 'rating-%' then
    select movie_ratings.user_id, movie_ratings.movie_id, movie_ratings.movie_title
    into movie_owner_id, movie_id, movie_title
    from public.movie_ratings
    where movie_ratings.id::text = replace(new.post_id, 'rating-', '')
    limit 1;

    if movie_owner_id is not null then
      perform public.popscore_insert_notification(
        movie_owner_id,
        new.user_id,
        'comment_reaction',
        'review',
        '/community#post-' || new.post_id,
        actor_name || ' liked your review' ||
          case when movie_title is not null then ' of ' || movie_title else '' end ||
          '.'
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.popscore_notify_community_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  comment_owner_id uuid;
  comment_post_id text;
  movie_id text;
  movie_title text;
begin
  actor_name := public.popscore_notification_display_name(new.user_id);

  select community_comments.user_id, community_comments.post_id
  into comment_owner_id, comment_post_id
  from public.community_comments
  where community_comments.id = new.comment_id
  limit 1;

  if comment_post_id like 'rating-%' then
    select movie_ratings.movie_id, movie_ratings.movie_title
    into movie_id, movie_title
    from public.movie_ratings
    where movie_ratings.id::text = replace(comment_post_id, 'rating-', '')
    limit 1;
  end if;

  if comment_owner_id is not null then
    perform public.popscore_insert_notification(
      comment_owner_id,
      new.user_id,
      'comment_reaction',
      'movie_comment',
      case
        when comment_post_id is not null then '/community#post-' || comment_post_id
        else '/community'
      end,
      actor_name || ' liked your comment' ||
        case when movie_title is not null then ' on ' || movie_title else '' end ||
        '.'
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.user_follows') is not null then
    drop trigger if exists user_follows_notify_new_follower on public.user_follows;
    create trigger user_follows_notify_new_follower
    after insert on public.user_follows
    for each row execute function public.popscore_notify_new_follower();
  end if;

  if to_regclass('public.community_comments') is not null then
    drop trigger if exists community_comments_notify_owner on public.community_comments;
    create trigger community_comments_notify_owner
    after insert on public.community_comments
    for each row execute function public.popscore_notify_community_comment();
  end if;

  if to_regclass('public.community_post_likes') is not null then
    drop trigger if exists community_post_likes_notify_owner on public.community_post_likes;
    create trigger community_post_likes_notify_owner
    after insert on public.community_post_likes
    for each row execute function public.popscore_notify_community_post_like();
  end if;

  if to_regclass('public.community_comment_likes') is not null then
    drop trigger if exists community_comment_likes_notify_owner on public.community_comment_likes;
    create trigger community_comment_likes_notify_owner
    after insert on public.community_comment_likes
    for each row execute function public.popscore_notify_community_comment_like();
  end if;
end $$;
