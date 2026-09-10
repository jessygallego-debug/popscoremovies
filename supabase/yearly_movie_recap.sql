-- Run once to enable annual movie recap preferences and duplicate-safe delivery tracking.

alter table public.profiles
add column if not exists email_yearly_recap boolean default true not null;

alter table public.profiles
alter column email_yearly_recap set default true;

-- This table is shared by all recurring PopScore emails. Some older databases
-- predate the monthly-email migration, so create it here when needed.
create table if not exists public.monthly_watchlist_suppressions (
  email text primary key,
  reason text not null,
  provider text default 'resend' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.monthly_watchlist_suppressions enable row level security;
revoke all on public.monthly_watchlist_suppressions from anon, authenticated;

create table if not exists public.yearly_recap_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recap_year integer not null check (recap_year >= 2000 and recap_year <= 2200),
  email text not null,
  status text default 'pending' not null check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer default 0 not null,
  resend_email_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, recap_year)
);

create index if not exists yearly_recap_deliveries_year_status_idx
on public.yearly_recap_deliveries (recap_year, status);

alter table public.yearly_recap_deliveries enable row level security;

create or replace function public.set_yearly_recap_delivery_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists yearly_recap_deliveries_set_updated_at on public.yearly_recap_deliveries;
create trigger yearly_recap_deliveries_set_updated_at
before update on public.yearly_recap_deliveries
for each row execute function public.set_yearly_recap_delivery_updated_at();

-- Keep provider-suppressed addresses opted out of this email too.
update public.profiles as profile
set email_yearly_recap = false
from auth.users as auth_user
where auth_user.id = profile.user_id
  and exists (
    select 1 from public.monthly_watchlist_suppressions as suppression
    where lower(suppression.email) = lower(auth_user.email)
  );
