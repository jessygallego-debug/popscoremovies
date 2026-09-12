-- Keep achievement emails enabled for all existing and future PopScore profiles.
alter table public.profiles
add column if not exists email_achievement_notifications boolean default true not null;

alter table public.profiles
alter column email_achievement_notifications set default true;

update public.profiles
set email_achievement_notifications = true
where email_achievement_notifications is distinct from true;
