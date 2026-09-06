create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists email_monthly_watchlist boolean default false not null;

create table if not exists public.monthly_watchlists (
  id uuid primary key default gen_random_uuid(),
  month_key date unique not null,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2200),
  status text default 'draft' not null
    check (status in ('draft', 'ready', 'sending', 'sent', 'failed')),
  subject text not null,
  preview_text text not null,
  generated_at timestamptz default now() not null,
  finalized_at timestamptz,
  sent_at timestamptz,
  recipient_count int default 0 not null,
  successful_sends int default 0 not null,
  failed_sends int default 0 not null,
  error_message text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.monthly_watchlist_movies (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references public.monthly_watchlists(id) on delete cascade not null,
  movie_id text not null,
  movie_title text not null,
  poster_path text not null,
  category text not null check (category in ('digital', 'subscription_streaming')),
  release_date date not null,
  provider text,
  availability_type text not null check (availability_type in ('rent_buy', 'subscription')),
  ranking_score numeric default 0 not null,
  display_order int not null check (display_order between 1 and 4),
  source_url text not null,
  verified_at timestamptz not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,

  constraint monthly_watchlist_movies_category_type
    check (
      (category = 'digital' and availability_type = 'rent_buy' and provider is null)
      or
      (category = 'subscription_streaming' and availability_type = 'subscription' and provider is not null)
    ),
  constraint monthly_watchlist_movies_unique_section
    unique (watchlist_id, movie_id, category),
  constraint monthly_watchlist_movies_unique_order
    unique (watchlist_id, category, display_order)
);

create table if not exists public.monthly_watchlist_recipients (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references public.monthly_watchlists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  status text default 'pending' not null
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int default 0 not null,
  provider_email_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint monthly_watchlist_recipients_unique_user
    unique (watchlist_id, user_id)
);

create table if not exists public.monthly_watchlist_suppressions (
  email text primary key,
  reason text not null,
  provider text default 'resend' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists monthly_watchlists_status_idx
on public.monthly_watchlists (status, month_key desc);

create index if not exists monthly_watchlist_movies_watchlist_idx
on public.monthly_watchlist_movies (watchlist_id, category, display_order);

create index if not exists monthly_watchlist_recipients_status_idx
on public.monthly_watchlist_recipients (watchlist_id, status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists monthly_watchlists_set_updated_at on public.monthly_watchlists;
create trigger monthly_watchlists_set_updated_at
before update on public.monthly_watchlists
for each row execute function public.set_updated_at();

drop trigger if exists monthly_watchlist_recipients_set_updated_at on public.monthly_watchlist_recipients;
create trigger monthly_watchlist_recipients_set_updated_at
before update on public.monthly_watchlist_recipients
for each row execute function public.set_updated_at();

alter table public.monthly_watchlists enable row level security;
alter table public.monthly_watchlist_movies enable row level security;
alter table public.monthly_watchlist_recipients enable row level security;
alter table public.monthly_watchlist_suppressions enable row level security;

revoke all on public.monthly_watchlists from anon, authenticated;
revoke all on public.monthly_watchlist_movies from anon, authenticated;
revoke all on public.monthly_watchlist_recipients from anon, authenticated;
revoke all on public.monthly_watchlist_suppressions from anon, authenticated;
