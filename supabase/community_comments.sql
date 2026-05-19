create extension if not exists pgcrypto;

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now() not null,
  constraint community_comments_body_length
    check (char_length(body) <= 200),
  constraint community_comments_body_clean
    check (
      body !~* '(f[[:punct:][:space:]_]*u[[:punct:][:space:]_]*c[[:punct:][:space:]_]*k|sh[i1]t[[:alnum:]_]*|b[i1]tch[[:alnum:]_]*|asshole[[:alnum:]_]*|cunt[[:alnum:]_]*|whore[[:alnum:]_]*|slut[[:alnum:]_]*|dick[[:alnum:]_]*|bastard[[:alnum:]_]*|motherfucker[[:alnum:]_]*|fag[[:alnum:]_]*|kike[[:alnum:]_]*|nazi[[:alnum:]_]*|n[i1][[:punct:][:space:]_]*g[[:punct:][:space:]_]*g(a|er)[[:alnum:]_]*|sp[i1]c[[:alnum:]_]*|ch[i1]nk[[:alnum:]_]*|gook[[:alnum:]_]*|wetback[[:alnum:]_]*|beaner[[:alnum:]_]*|towelhead[[:alnum:]_]*|raghead[[:alnum:]_]*)'
    )
);

create index if not exists community_comments_post_created_idx
on public.community_comments (post_id, created_at);

create table if not exists public.community_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.community_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(comment_id, user_id)
);

create index if not exists community_comment_likes_comment_idx
on public.community_comment_likes (comment_id);

alter table public.community_comments enable row level security;
alter table public.community_comment_likes enable row level security;

drop policy if exists "Community comments are public" on public.community_comments;
create policy "Community comments are public"
on public.community_comments for select
using (true);

drop policy if exists "Users create their own community comments" on public.community_comments;
create policy "Users create their own community comments"
on public.community_comments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own community comments" on public.community_comments;
create policy "Users delete their own community comments"
on public.community_comments for delete
using (auth.uid() = user_id);

drop policy if exists "Community comment likes are public" on public.community_comment_likes;
create policy "Community comment likes are public"
on public.community_comment_likes for select
using (true);

drop policy if exists "Users create their own community comment likes" on public.community_comment_likes;
create policy "Users create their own community comment likes"
on public.community_comment_likes for insert
with check (
  auth.uid() = user_id
  and not exists (
    select 1
    from public.community_comments
    where community_comments.id = comment_id
      and community_comments.user_id = auth.uid()
  )
);

drop policy if exists "Users delete their own community comment likes" on public.community_comment_likes;
create policy "Users delete their own community comment likes"
on public.community_comment_likes for delete
using (auth.uid() = user_id);
