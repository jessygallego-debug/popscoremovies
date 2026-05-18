alter table public.movie_ratings
add column if not exists review_comment text;

alter table public.movie_ratings
drop constraint if exists movie_ratings_review_comment_length;

alter table public.movie_ratings
add constraint movie_ratings_review_comment_length
check (review_comment is null or char_length(review_comment) <= 300);

alter table public.movie_ratings
drop constraint if exists movie_ratings_review_comment_clean;

alter table public.movie_ratings
add constraint movie_ratings_review_comment_clean
check (
  review_comment is null
  or review_comment !~* '(f[[:punct:][:space:]_]*u[[:punct:][:space:]_]*c[[:punct:][:space:]_]*k|sh[i1]t[[:alnum:]_]*|b[i1]tch[[:alnum:]_]*|asshole[[:alnum:]_]*|cunt[[:alnum:]_]*|whore[[:alnum:]_]*|slut[[:alnum:]_]*|dick[[:alnum:]_]*|bastard[[:alnum:]_]*|motherfucker[[:alnum:]_]*)'
);
