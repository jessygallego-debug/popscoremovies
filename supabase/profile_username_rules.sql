alter table public.profiles
add column if not exists email text;

update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.user_id = auth.users.id
  and public.profiles.email is null;

create or replace function public.username_is_clean(username text)
returns boolean
language sql
immutable
as $$
  select not (
    regexp_replace(lower(coalesce(username, '')), '_', '', 'g') like any (
      array[
        '%anal%',
        '%anus%',
        '%bitch%',
        '%blowjob%',
        '%boner%',
        '%boob%',
        '%clit%',
        '%cock%',
        '%cunt%',
        '%dick%',
        '%dildo%',
        '%fag%',
        '%fuck%',
        '%fuk%',
        '%hitler%',
        '%hoe%',
        '%jizz%',
        '%kike%',
        '%kkk%',
        '%nazi%',
        '%nigga%',
        '%nigger%',
        '%penis%',
        '%porn%',
        '%pussy%',
        '%rape%',
        '%rapist%',
        '%retard%',
        '%sex%',
        '%shit%',
        '%slut%',
        '%tits%',
        '%vagina%',
        '%whore%'
      ]
    )
  );
$$;

alter table public.profiles
drop constraint if exists username_clean;

alter table public.profiles
add constraint username_clean
check (public.username_is_clean(username));

create or replace function public.prevent_username_change()
returns trigger
language plpgsql
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'Username cannot be changed after profile creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_username_change on public.profiles;

create trigger profiles_prevent_username_change
before update on public.profiles
for each row execute function public.prevent_username_change();
