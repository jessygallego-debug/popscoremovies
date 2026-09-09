export const DEFAULT_MONTHLY_WATCHLIST_PREFERENCE = true;

export function resolveMonthlyWatchlistPreference(
  preference: boolean | null | undefined
) {
  return preference !== false;
}

export function filterEligibleMonthlyWatchlistRecipients<
  T extends { email: string; user_id: string },
>(
  recipients: T[],
  eligibleUserIds: ReadonlySet<string>,
  suppressedEmails: ReadonlySet<string>
) {
  return recipients.filter(
    (recipient) =>
      eligibleUserIds.has(recipient.user_id) &&
      !suppressedEmails.has(recipient.email.trim().toLowerCase())
  );
}
