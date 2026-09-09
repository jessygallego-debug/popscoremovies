-- Run once for an existing PopScore database. This changes the default for new
-- profiles and enrolls current deliverable profiles in the monthly watchlist.
-- Provider-suppressed addresses remain opted out and will not be emailed.

alter table public.profiles
add column if not exists email_monthly_watchlist boolean default true not null;

alter table public.profiles
alter column email_monthly_watchlist set default true;

update public.profiles
set email_monthly_watchlist = true;

update public.profiles as profile
set email_monthly_watchlist = false
from auth.users as auth_user
where auth_user.id = profile.user_id
  and exists (
    select 1
    from public.monthly_watchlist_suppressions as suppression
    where lower(suppression.email) = lower(auth_user.email)
  );
