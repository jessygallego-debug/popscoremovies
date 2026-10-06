# Automated PopScore releases

Month-end collection and a send-day recheck use existing TMDB and Supabase infrastructure. No paid API is
added. The external monthly feed remains available as a legacy mode when
`MONTHLY_RELEASE_COLLECTOR_ENABLED` is not `true`.

## Evidence and selection

TMDB IDs are canonical. `release_movie_metadata` is a cache, not a second movie
identity system. US type-4 records supply digital candidates. Subscription
platform notes are excluded from rent/buy classification. The earliest known US
rent/buy digital record wins; old catalog titles without credible first-release
history and titles without theatrical evidence are conservatively LOW.

Future subscription dates require an exact recognized provider note in a US
type-4 digital or type-6 TV record, or a reviewed structured source. TMDB provider
notes are MEDIUM, not official confirmation. A provider snapshot cannot supply
an announced date. Only `flatrate` creates detected-availability evidence; rent
and buy remain separate. The initial snapshot establishes a baseline.

Sources keep separate evidence. Official > structured > TMDB > supplemental >
detection resolves conflicts. Equal-priority disagreement is LOW. Independent
corroboration can increase confidence; TMDB-derived calendars cannot corroborate
TMDB. Evidence older than 14 days is LOW and withheld. Current V1 withholds all
LOW records rather than risking a fabricated date to fill a slot.

Relevance uses log-scaled popularity, vote count, revenue, franchise recognition
and recent theatrical release. Vote average does not determine ranking. A score
of 100 is the conservative V1 notability threshold. Optional approval can relax
notability but cannot override freshness, country, confidence or exact dates.
The system selects up to five unique movies per category, preferring provider
variety. Separate digital and subscription events can feature the same movie.

Campaign and delivery tables are reused. Atomic refresh locks the campaign and
replaces its movie set within one transaction. Failed refreshes retain previous
sets. Sending/sent campaigns cannot be edited. Delivery preferences, suppressions
and recipient idempotency remain in the existing email implementation.

## Sources investigated October 6, 2026

* TMDB US release dates and US watch-provider endpoints: enabled using existing
  credentials. Watch-provider data requires JustWatch attribution; this collector
  does not reproduce availability listings in the public UI.
* FilmCalendar's published endpoint exists:
  `https://filmcalendar.app/api/calendar?region=US&type=digital`.
  It fails the required date semantics: sampled entries list Sinners April 18,
  2025; Disclosure Day June 12, 2026; Spider-Man: Brand New Day July 31, 2026.
  Those are theatrical dates, not their required US home-release dates. It also
  derives data from TMDB, and commercial automated reuse was not established.
  No production dependency or title matching is enabled.
* MovieCalendar's ICS endpoint exists, but its terms prohibit systematic
  extraction and commercial reuse without written permission. It is not enabled.
* No verified independent free future-streaming feed has been enabled. Provider
  coverage remains uneven, particularly far ahead of a month. This is reported,
  not hidden by assuming current availability is a future release.

## Extending sources

`release_sources` is backend-only. Enable a source only after verifying its
endpoint, automation/reuse permissions, US coverage, future-date semantics and
stability. The adapter accepts a JSON array of `{tmdbId, providerId, releaseDate,
country:"US", sourceUrl}` records. Provider IDs are slugs in `streaming_providers`.
It verifies unknown IDs against TMDB and never merges uncertain titles. An
adapter that only has titles must implement conservative matching before
producing this canonical contract; ambiguous matches must be rejected.

Store the source's permission decision and independent origin in the registry.
HTTP retrieval time is the verification time only for reviewed authoritative or
continuously maintained structured endpoints. Do not enable a static/stale JSON
export and relabel its contents as newly verified. A future paid provider can
implement the same contract after cost approval.

## Schedule and controls

`/api/cron/movie-releases` uses `CRON_SECRET` and collects today through +60 days
at 12:00 UTC on the last Eastern calendar day of each month. The cron invokes on
days 28–31; the endpoint skips non-month-end days before making source requests.
Explicitly requested admin/validation refreshes remain available. A database lease prevents overlapping collectors. Requests
are bounded, use timeouts and isolate failures. Evidence is retained on source
failure; date changes supersede previous evidence without deleting its audit.

The month-end job refreshes/finalizes the next month. The send-day job rechecks
releases, rebuilds selection, and sends through the existing monthly workflow.
Email copy always states dated Digital/service releases without assuming they
are available now. `MONTHLY_WATCHLIST_START_MONTH=2026-11-01` prevents earlier
sending. `MONTHLY_WATCHLIST_MIN_AUTOMATIC_PICKS=2` skips a sparse month rather
than emailing a misleadingly incomplete selection. A sparse campaign stays
available in admin; automatic delivery does not fabricate replacements.

`/admin/monthly-watchlist` exposes candidates even before a campaign is generated:
posters, dates, service, source, confidence, verification time, score, exclusions,
approval and same-section replacement. These actions require existing admin
authorization. Manual approval is optional. All collection tables have RLS and
explicit service-only grants; anon/authenticated cannot read or modify them.

## Validation

Protected previews collected October and November without sending emails.
See [release-validation.json](artifacts/release-validation.json) for counts,
confidence percentages, selected movies, benchmark coverage and provider gaps.
October reaches five eligible picks per section and includes both requested
benchmarks. November is still sparse as of October 6 and would be skipped by the
automatic send guard unless later refreshes provide enough eligible picks.

Unit tests cover country/type filtering, baseline snapshots, availability-only
dates, conflicts, stale evidence, provider-note ambiguity and engagement ranking.
PGlite tests apply existing campaign and new release migrations, preserve data,
verify backend allow/deny and client denial, ensure collector exclusivity, and
check atomic rollback and locked-campaign behavior. Schedule tests cover every
day in ordinary/leap years and Eastern timezone boundaries. No Supabase preview branch
exists; no paid branch was created. The same migration is applied to production
for protected live collection. Subscriber and test emails were not sent.
