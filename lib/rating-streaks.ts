type RatingDateRecord = {
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMidnight(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function uniqueRatingDays(ratings: RatingDateRecord[]) {
  return Array.from(
    new Set(
      ratings
        .filter((rating) => Number.isFinite(new Date(rating.created_at).getTime()))
        .map((rating) => localDateKey(rating.created_at))
    )
  ).sort();
}

function daysBetween(earlier: string, later: string) {
  return Math.round(
    (localMidnight(later).getTime() - localMidnight(earlier).getTime()) /
      DAY_MS
  );
}

export function getLongestRatingStreak(ratings: RatingDateRecord[]) {
  const days = uniqueRatingDays(ratings);

  if (days.length === 0) return 0;

  let current = 1;
  let longest = 1;

  for (let index = 1; index < days.length; index += 1) {
    current = daysBetween(days[index - 1], days[index]) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }

  return longest;
}

export function getCurrentRatingStreak(
  ratings: RatingDateRecord[],
  now = new Date()
) {
  const days = uniqueRatingDays(ratings);

  if (days.length === 0) return 0;

  const latestDay = days.at(-1)!;
  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setHours(12, 0, 0, 0);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  if (latestDay !== today && latestDay !== yesterday) return 0;

  let streak = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (daysBetween(days[index - 1], days[index]) !== 1) break;
    streak += 1;
  }

  return streak;
}
