-- Supabase's existing default privileges also grant service_role full access.
-- Narrow only the newly introduced release tables; existing product tables are untouched.
revoke all on public.streaming_providers,public.release_sources,
 public.release_movie_metadata,public.movie_release_events,public.movie_provider_snapshots,
 public.monthly_release_overrides,public.release_collection_runs from service_role;
grant select,insert,update on public.streaming_providers,public.release_sources,
 public.release_movie_metadata,public.movie_release_events,public.movie_provider_snapshots,
 public.monthly_release_overrides,public.release_collection_runs to service_role;
revoke all on public.upcoming_streaming_releases from service_role;
grant select on public.upcoming_streaming_releases to service_role;
