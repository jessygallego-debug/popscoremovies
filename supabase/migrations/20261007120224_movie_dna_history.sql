-- Private derived state only. Deleting an account removes its DNA snapshot;
-- ratings, reviews and other existing tables are not changed.
create table public.movie_dna_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personality text check (personality is null or length(personality) between 1 and 80),
  previous_personality text,
  confidence double precision not null check (confidence between 0 and 1),
  rating_count integer not null check (rating_count >= 0),
  input_fingerprint text not null check (input_fingerprint ~ '^[a-f0-9]{64}$'),
  algorithm_version integer not null check (algorithm_version > 0),
  personality_changed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.movie_dna_snapshots enable row level security;
revoke all on public.movie_dna_snapshots from anon, authenticated;
grant select on public.movie_dna_snapshots to authenticated;
grant insert (user_id, personality, confidence, rating_count, input_fingerprint, algorithm_version)
  on public.movie_dna_snapshots to authenticated;
grant update (personality, confidence, rating_count, input_fingerprint, algorithm_version)
  on public.movie_dna_snapshots to authenticated;
grant select, insert, update, delete on public.movie_dna_snapshots to service_role;
create policy "Read own Movie DNA snapshot" on public.movie_dna_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own Movie DNA snapshot" on public.movie_dna_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own Movie DNA snapshot" on public.movie_dna_snapshots
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.track_movie_dna_change() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.previous_personality := null;
    new.personality_changed_at := case when new.personality is not null then now() else null end;
  else
    new.previous_personality := old.previous_personality;
    new.personality_changed_at := old.personality_changed_at;
    -- Weak/temporarily ambiguous results do not erase the last known personality.
    -- A confident new model result records the prior label atomically.
    if new.personality is null then
      new.personality := old.personality;
    elsif new.personality is distinct from old.personality then
      if new.rating_count < 15 or new.confidence < 0.35 then
        new.personality := old.personality;
      else
        new.previous_personality := old.personality;
        new.personality_changed_at := now();
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.track_movie_dna_change() from public, anon, authenticated;
create trigger track_movie_dna_change before insert or update on public.movie_dna_snapshots
  for each row execute function public.track_movie_dna_change();
