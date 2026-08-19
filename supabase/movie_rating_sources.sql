alter table public.movie_ratings
add column if not exists rating_source text;

alter table public.movie_ratings
drop constraint if exists movie_ratings_rating_source_valid;

alter table public.movie_ratings
add constraint movie_ratings_rating_source_valid
check (rating_source is null or rating_source in ('movie_match'));

create index if not exists movie_ratings_user_source_idx
on public.movie_ratings (user_id, rating_source, updated_at desc);
