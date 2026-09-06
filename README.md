This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Create a `.env.local` file with your TMDB API read token:

```bash
TMDB_API_TOKEN=your_tmdb_read_access_token
```

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Monthly Watchlist campaign

Apply `supabase/monthly_watchlist.sql`, then configure these server-side Vercel
environment variables:

```text
CRON_SECRET=...
EMAIL_UNSUBSCRIBE_SECRET=at-least-32-random-characters
MONTHLY_WATCHLIST_RELEASE_FEED_URL=https://your-verified-feed.example/releases
MONTHLY_WATCHLIST_FEED_TOKEN=... # optional when the feed is public
MONTHLY_WATCHLIST_TEST_EMAIL=admin@example.com
MONTHLY_WATCHLIST_STREAMING_PROVIDERS=Netflix,Disney+,Hulu,Max,Prime Video,Apple TV+,Paramount+,Peacock # optional allowlist override
MONTHLY_WATCHLIST_ENABLED=false
POPSCORE_ADMIN_EMAILS=admin@example.com
RESEND_API_KEY=...
RESEND_FROM_EMAIL=PopScore <watchlist@popscoremovies.com>
RESEND_WEBHOOK_SECRET=...
```

The release feed is queried with `month=YYYY-MM&region=US` and must return:

```json
{
  "items": [
    {
      "movieId": 123,
      "category": "digital",
      "availabilityType": "rent_buy",
      "releaseDate": "2026-10-08",
      "provider": null,
      "rankingScore": 90,
      "sourceUrl": "https://source.example/release/123",
      "verifiedAt": "2026-09-25T14:00:00Z"
    },
    {
      "movieId": 456,
      "category": "subscription_streaming",
      "availabilityType": "subscription",
      "releaseDate": "2026-10-18",
      "provider": "Netflix",
      "rankingScore": 85,
      "sourceUrl": "https://source.example/release/456",
      "verifiedAt": "2026-09-25T14:00:00Z"
    }
  ]
}
```

Unknown, stale, malformed, or incorrectly categorized entries are excluded. The
campaign does not infer future subscription dates from TMDB watch-provider data.
TMDB is used to verify movie identity and poster data and as a ranking signal.

The Vercel cron runs daily at 14:00 UTC. It creates the next month's draft on the
26th (Eastern calendar date), then refreshes, finalizes, and sends on the 1st.
Keep `MONTHLY_WATCHLIST_ENABLED` unset while testing. Use
`/admin/monthly-watchlist` to generate, preview, finalize, and send a test email.
After the SQL migration, feed, Resend webhook, desktop preview, and mobile inbox
test are verified, set:

```text
MONTHLY_WATCHLIST_ENABLED=true
```

Configure Resend to send bounce, complaint, and suppression webhooks to
`/api/email/resend-webhook`, and store its signing secret as
`RESEND_WEBHOOK_SECRET`.
