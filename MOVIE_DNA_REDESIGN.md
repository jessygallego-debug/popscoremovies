# Movie DNA model v2

Movie DNA learns from the user's latest complete, non-deleted PopScore questionnaire for each movie. It does not ask for preferences, change PopScores, or compare a user with the community. Existing summary charts retain their calculations.

## Favorites and personal baseline

Use 90+ movies when there are at least five. Otherwise use roughly the top 20%, including score ties. If a large boundary tie absorbs the comparison group, use the strictly higher group when at least three movies remain. Uniformly rated histories cannot supply a contrast. Require three favorites, three comparison movies, and a meaningful difference in overall scores before drawing insights.

Each available question is converted with that rating's existing scoring scale, including the different documentary scale and historic questionnaires. Acting, voice acting and the existing shared Character question are comparable. Missing answers never become zero. Genre-specific questions are compared only with answers from the same questionnaire genre.

Dimension evidence combines favorite-minus-baseline improvement, consistency across favorites, sample-size shrinkage, and correlation with PopScore. Because questionnaire answers contribute to PopScore mathematically, correlation alone cannot assign a personality. Core personalities also require a larger improvement than the other core qualities: generic improvements across every question do not produce Story Seeker or generic quality badges.

Genre evidence combines rated volume, above-personal-average PopScores, favorite concentration relative to exposure, and relevant question evidence. Reliable existing genre names supplement the questionnaire genre; multi-genre movies count once per category. Release-era evidence requires enough valid dates and sufficient coverage. No title-based franchise, superhero, darkness, or other subjective inference is made; no extra TMDB calls are introduced.

## Confidence and presentation

Evidence scores are deterministic heuristics, not calibrated statistical probabilities. Initial thresholds are deliberately conservative and should be tuned with representative data over time. Fewer than five questionnaires are forming; five to fourteen are early; fifteen to twenty-nine are developing. Thirty or more can be established when the evidence is strong. A label is never guaranteed by a count alone, and exact thresholds are not advertised in the interface.

Personality candidates include Story Seeker, Character Loyalist, Rewatcher, Comfort Watcher, Horror Devotee, Laugh Seeker, Thrill Chaser, Escapist, Genre Explorer and Movie Adventurer. A weak or close contest remains forming. The full history carries equal weight; at fifteen or more ratings, removing the newest movie must support the personality family. This delays a new family until evidence persists beyond a single movie. A supported prior family is retained through a one-movie ambiguity. Sustained new preferences can still change the result.

You Love contains at most three supported patterns, suppresses repeats of the chosen personality, and combines redundant era/genre signals. Empty slots remain empty. The profile, share preview and exported image consume the same model output.

## Private evolution history

Migration: `supabase/migrations/20261007120224_movie_dna_history.sql`.

`movie_dna_snapshots` stores the current and previous personality, confidence, questionnaire count, input fingerprint, algorithm version and change timestamp. It is private to its authenticated owner. Grants are explicitly limited to SELECT and the INSERT/UPDATE columns the feature uses. Clients cannot DELETE, reassign ownership, or set the previous personality/timestamps. RLS denies cross-user reads/writes. A security-invoker trigger records transitions atomically and preserves the previous confident label when new evidence is weak. Account deletion removes this derived snapshot only.

The owner's profile saves changed input once; a SHA-256 fingerprint avoids repeated writes on reload. The expected owner is checked against the active session and RLS enforces ownership again. Compare-and-swap avoids overwriting a concurrently changed snapshot. Visitors to another profile do not read/write its history. Snapshot failures leave the computed DNA usable. No evolution notifications or emails are sent. The table is prepared for a future notification feature; history begins after rollout and cannot reconstruct earlier unsaved labels.

## Verification and rollout

- Algorithm, regression and browser suites: `tests/e2e/movie-dna-redesign.spec.ts`, `tests/e2e/movie-dna.spec.ts`, `tests/e2e/documentary-rating.spec.ts`.
- Database suite: `node scripts/test-movie-dna-database.mjs`. It runs the migration and allow/deny cases in two clean PostgreSQL-compatible PGlite databases; this is not a hosted Supabase preview-branch test.
- Apply the migration on a Supabase preview branch, verify authenticated REST access and denied access there, then apply it before deploying the UI to production. No production database changes are made by the local tests.
- One pre-existing Stats test expects retired "Rate Different" wording; it is outside this redesign. Targeted DNA and documentary checks exclude that unrelated assertion.

Production rollout verification: the migration was applied to the PopScore Supabase project after the isolated build and fresh-database tests. Hosted PostgreSQL role tests passed for owner writes, atomic transition history, protected columns, anonymous denial, cross-user denial and service reads; all test writes were rolled back. No hosted preview branch was available. Security advisors reported no Movie DNA notices. The isolated release passed all 42 targeted checks before push.
