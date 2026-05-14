alter table public.co_star_reactions
add column if not exists user_id uuid references auth.users(id) on delete cascade;

drop index if exists public.co_star_reactions_user_movie_unique;

alter table public.co_star_reactions
drop constraint if exists co_star_reactions_user_movie_unique;

alter table public.co_star_reactions
add constraint co_star_reactions_user_movie_unique
unique (user_id, movie_id);

alter table public.co_star_reactions enable row level security;

drop policy if exists "Co-star reactions are public" on public.co_star_reactions;
create policy "Co-star reactions are public"
on public.co_star_reactions for select
using (true);

drop policy if exists "Users create their own co-star reactions" on public.co_star_reactions;
create policy "Users create their own co-star reactions"
on public.co_star_reactions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own co-star reactions" on public.co_star_reactions;
create policy "Users update their own co-star reactions"
on public.co_star_reactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
