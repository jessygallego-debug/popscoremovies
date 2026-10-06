-- All collection and oversight writes are server-only, behind cron/admin authorization.
create table public.streaming_providers (
  provider_id text primary key,
  provider_name text not null,
  tmdb_provider_ids integer[] not null,
  enabled boolean not null default true
);
insert into public.streaming_providers values
 ('netflix','Netflix',array[8],true), ('disney','Disney+',array[337],true),
 ('hulu','Hulu',array[15],true), ('max','HBO Max',array[1899],true),
 ('peacock','Peacock',array[386,387],true), ('paramount','Paramount+',array[531],true),
 ('prime','Prime Video',array[9],true), ('apple','Apple TV+',array[350],true);
create table public.release_sources (
 source_id text primary key, name text not null,
 kind text not null check(kind in ('official','structured','tmdb','supplemental','detection')),
 independent_family text not null, enabled boolean not null default false,
 endpoint text, permission_note text not null, last_checked_at timestamptz, last_error text
);
insert into public.release_sources(source_id,name,kind,independent_family,enabled,permission_note) values
 ('tmdb','TMDB US release dates','tmdb','tmdb',true,'Existing licensed TMDB API access; type 4 with explicit US dates only.'),
 ('tmdb_availability','TMDB US subscription availability','detection','tmdb',true,'Existing API access; flatrate snapshots only. Detection is not an announced premiere.');
create table public.release_movie_metadata (
 tmdb_id bigint primary key check(tmdb_id>0), title text not null, poster_path text,
 popularity double precision not null default 0, vote_count integer not null default 0,
 vote_average double precision not null default 0, metadata jsonb not null default '{}',
 verified_at timestamptz not null
);
create table public.movie_release_events (
 id uuid primary key default gen_random_uuid(), tmdb_id bigint not null references public.release_movie_metadata,
 release_type text not null check(release_type in ('digital','subscription_streaming')),
 provider_id text references public.streaming_providers,
 announced_release_date date, detected_available_date date,
 country text not null default 'US' check(country='US'),
 source_id text not null references public.release_sources, source_event_key text not null,
 source_url text not null check(source_url like 'https://%'),
 confidence text not null check(confidence in ('HIGH','MEDIUM','LOW')),
 verified_at timestamptz not null, created_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','superseded','cancelled')),
 evidence jsonb not null default '{}',
 check(announced_release_date is not null or detected_available_date is not null),
 check((release_type='digital' and provider_id is null) or (release_type='subscription_streaming' and provider_id is not null)),
 unique(source_id,source_event_key)
);
create index release_events_month on public.movie_release_events(announced_release_date,release_type) where status='active';
create index release_events_movie on public.movie_release_events(tmdb_id,source_id);
create table public.movie_provider_snapshots (
 tmdb_id bigint not null references public.release_movie_metadata,
 checked_date date not null, checked_at timestamptz not null,
 flatrate integer[] not null, rent integer[] not null, buy integer[] not null,
 primary key(tmdb_id,checked_date)
);
create table public.monthly_release_overrides (
 month_key date not null check(extract(day from month_key)=1),
 event_id uuid not null references public.movie_release_events,
 action text not null check(action in ('approve','exclude')),
 updated_at timestamptz not null default now(), primary key(month_key,event_id)
);
create table public.release_collection_runs (
 id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null check(status in ('running','complete','partial','failed')),
 report jsonb not null default '{}'
);
create unique index release_collection_one_running on public.release_collection_runs(status) where status='running';
create function public.claim_release_collection(p_report jsonb) returns uuid
language plpgsql set search_path=pg_catalog as $$
declare claimed uuid; begin
 update public.release_collection_runs set status='failed',finished_at=now(),report=report||'{"error":"Expired collector lease"}'::jsonb
 where status='running' and started_at<now()-interval '10 minutes';
 insert into public.release_collection_runs(status,report) values('running',p_report)
 on conflict (status) where status='running' do nothing returning id into claimed;
 return claimed;
end $$;
revoke execute on function public.claim_release_collection(jsonb) from public,anon,authenticated;
grant execute on function public.claim_release_collection(jsonb) to service_role;
-- Announcements share one audited evidence table; this view supplies the requested future-streaming model.
create view public.upcoming_streaming_releases with (security_invoker=true) as
 select id,tmdb_id,provider_id,announced_release_date as release_date,country,
 source_id as source_name,source_url,confidence,verified_at,created_at
 from public.movie_release_events where release_type='subscription_streaming'
 and announced_release_date is not null and status='active';
do $$ declare t text; begin
 foreach t in array array['streaming_providers','release_sources','release_movie_metadata','movie_release_events','movie_provider_snapshots','monthly_release_overrides','release_collection_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 execute format('grant select, insert, update on public.%I to service_role',t);
 end loop;
end $$;
revoke all on public.upcoming_streaming_releases from public,anon,authenticated;
grant select on public.upcoming_streaming_releases to service_role;
-- Preserve campaign data while permitting the newly requested fifth slot.
alter table public.monthly_watchlist_movies drop constraint if exists monthly_watchlist_movies_display_order_check;
alter table public.monthly_watchlist_movies add constraint monthly_watchlist_movies_display_order_check check(display_order between 1 and 5);
