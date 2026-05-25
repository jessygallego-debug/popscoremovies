alter table public.profiles
add column if not exists preferred_movie_language text,
add column if not exists preferred_movie_region text,
add column if not exists preferred_movie_era text default '1960',
add column if not exists preferred_movie_custom_year text,
add column if not exists include_international_movies boolean default false;

update public.profiles
set preferred_movie_era = '1960'
where preferred_movie_era is null;
