alter table public.profiles
add column if not exists top_movies jsonb default '[]'::jsonb not null;

alter table public.profiles
drop constraint if exists profiles_top_movies_valid;

alter table public.profiles
add constraint profiles_top_movies_valid
check (
  jsonb_typeof(top_movies) = 'array'
  and jsonb_array_length(top_movies) <= 5
);

comment on column public.profiles.top_movies is
'An ordered list of up to five user-selected all-time favorite movies.';
