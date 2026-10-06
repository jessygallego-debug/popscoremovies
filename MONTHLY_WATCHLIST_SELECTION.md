# Monthly Watchlist selection

The October 6 automated release policy supersedes the four-slot/manual-feed rules
below. See [AUTOMATED_RELEASES.md](AUTOMATED_RELEASES.md): up to five per section,
engagement-based relevance, audited source evidence, optional admin oversight,
and a two-pick safety gate for automatic delivery. The older broadcast history
below remains useful for understanding the original problem.

Applies to website campaigns and separately prepared Resend broadcasts.

Each subscriber email must contain four digital rent/buy releases and four subscription streaming arrivals for the target calendar month in the US. Research the complete month's release calendar, including upcoming dates, before selecting movies. Do not restrict research to Netflix or the first few results from a source.

Verify dates and provider names with studio, distributor, or streaming service announcements. Keep source URLs and verification timestamps for every candidate. Theatrical dates, physical-media dates, and current watch-provider availability do not establish a digital or subscription premiere date.

Use current TMDB popularity to rank eligible candidates, rather than manually assigned feed scores. Select the four most popular digital movies. For streaming, prefer no more than two movies from the same service, selecting the highest-popularity alternatives. If fewer than four picks can satisfy that preference, fill remaining slots with the highest-popularity remaining eligible movies. This is a popularity ranking subject to provider variety, rather than an unrestricted top four.

Deduplicate within each section. A movie may appear in both sections when it has independently verified digital and subscription arrivals that month.

Never finalize or send an incomplete section. Expand the research pool when fewer than four verified movies remain; do not substitute unverified dates or unrelated month's releases. Preview/test messages may show incomplete drafts while researching.

The website implements this policy in `lib/monthly-watchlist-selection.ts` and requires `MONTHLY_WATCHLIST_RELEASE_FEED_URL`. A separately composed Resend broadcast bypasses website validation. Before composing a broadcast, run `node scripts/select-monthly-watchlist.mjs candidates.json YYYY-MM` with enriched `MonthlyWatchlistMovie` candidate records and `rankingScore` set to current TMDB popularity. It outputs the eight selected records, or fails for stale/invalid candidates or incomplete sections. Compose the broadcast from this output. Do not assume deploying website code changes a manually prepared broadcast.

## October 2026 omission investigation

The sent Resend broadcast `98bce385-672b-4f22-87b0-a32de51587cc` contained two digital releases and four Netflix releases. The production website database had no corresponding October campaign when inspected. This was a separate broadcast, not a website-selected campaign.

Confirmed candidates missing from that broadcast:

- Disclosure Day: Peacock, October 9, 2026. Source: https://www.peacocktv.com/blog/when-where-disclosure-day-streaming
- Spider-Man: Brand New Day: digital retailers, October 6, 2026. Source: https://www.sonypictures.com/movies/spidermanbrandnewday

These release dates were checked on October 5, 2026. Inclusion in a newly generated ranked list requires current popularity and a complete competing candidate pool; do not hard-code these titles as automatic winners.
