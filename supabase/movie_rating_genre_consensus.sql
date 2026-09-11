create table if not exists public.movie_rating_genre_votes (
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_id text not null,
  genre text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  primary key (user_id, movie_id),
  constraint movie_rating_genre_votes_genre_valid check (
    genre in (
      'action', 'adventure', 'animated', 'comedy', 'documentary', 'drama',
      'family', 'fantasy', 'horror', 'musical', 'mystery', 'romance',
      'romcom', 'scifi', 'thriller', 'war', 'western'
    )
  )
);

create table if not exists public.movie_rating_genre_consensus (
  movie_id text primary key,
  genre text not null,
  vote_count integer not null,
  total_votes integer not null,
  updated_at timestamptz default now() not null,
  constraint movie_rating_genre_consensus_counts_valid check (
    vote_count >= 3 and total_votes >= vote_count
  )
);

create or replace function public.refresh_movie_rating_genre_consensus()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_movie_id text := case
    when tg_op = 'DELETE' then old.movie_id
    else new.movie_id
  end;
  leading_genre text;
  leading_votes integer := 0;
  runner_up_votes integer := 0;
  all_votes integer := 0;
begin
  select genre, count(*)::integer
  into leading_genre, leading_votes
  from public.movie_rating_genre_votes
  where movie_id = target_movie_id
  group by genre
  order by count(*) desc, genre asc
  limit 1;

  select coalesce(sum(vote_total), 0)::integer,
         coalesce(max(vote_total) filter (where genre <> leading_genre), 0)::integer
  into all_votes, runner_up_votes
  from (
    select genre, count(*)::integer as vote_total
    from public.movie_rating_genre_votes
    where movie_id = target_movie_id
    group by genre
  ) genre_votes;

  if leading_votes >= 3
     and leading_votes * 100 >= all_votes * 67
     and leading_votes - runner_up_votes >= 2 then
    insert into public.movie_rating_genre_consensus (
      movie_id, genre, vote_count, total_votes, updated_at
    ) values (
      target_movie_id, leading_genre, leading_votes, all_votes, now()
    )
    on conflict (movie_id) do update set
      genre = excluded.genre,
      vote_count = excluded.vote_count,
      total_votes = excluded.total_votes,
      updated_at = excluded.updated_at;
  else
    delete from public.movie_rating_genre_consensus
    where movie_id = target_movie_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists movie_rating_genre_votes_refresh_consensus
on public.movie_rating_genre_votes;

create trigger movie_rating_genre_votes_refresh_consensus
after insert or update or delete on public.movie_rating_genre_votes
for each row execute function public.refresh_movie_rating_genre_consensus();

alter table public.movie_rating_genre_votes enable row level security;
alter table public.movie_rating_genre_consensus enable row level security;

drop policy if exists "Users read their own rating genre votes"
on public.movie_rating_genre_votes;
create policy "Users read their own rating genre votes"
on public.movie_rating_genre_votes for select
using (auth.uid() = user_id);

drop policy if exists "Users create their own rating genre votes"
on public.movie_rating_genre_votes;
create policy "Users create their own rating genre votes"
on public.movie_rating_genre_votes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own rating genre votes"
on public.movie_rating_genre_votes;
create policy "Users update their own rating genre votes"
on public.movie_rating_genre_votes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Rating genre consensus is public"
on public.movie_rating_genre_consensus;
create policy "Rating genre consensus is public"
on public.movie_rating_genre_consensus for select
using (true);

revoke all on public.movie_rating_genre_votes from anon;
grant select, insert, update on public.movie_rating_genre_votes to authenticated;
grant select on public.movie_rating_genre_consensus to anon, authenticated;
