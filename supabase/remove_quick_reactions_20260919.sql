-- Apply after deploying the application that no longer reads/writes quick reactions.
-- Retires movie quick reactions only; community post/comment likes remain intact.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'movie_ratings'
      and column_name = 'quick_reaction'
  ) then
    -- Remove only empty placeholders created by the retired reaction writer.
    -- Preserve every row with rating answers, a review, or a viewing record.
    delete from public.movie_ratings as rating
    where rating.quick_reaction is not null
      and rating.ratings = '{}'::jsonb
      and rating.weights = '[]'::jsonb
      and rating.popscore = 0
      and nullif(btrim(rating.review_comment), '') is null
      and not exists (
        select 1 from public.user_movie_watches as watch
        where watch.rating_id = rating.id
      );
  end if;

  if to_regclass('public.user_achievements') is not null then
    delete from public.user_achievements where achievement_id = 'first_reaction';
  end if;
end;
$$;

alter table public.movie_ratings drop column if exists quick_reaction;
drop table if exists public.co_star_reactions;

commit;
