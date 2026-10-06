export function isMonthEndCollectionDay(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const lastDay = new Date(
    Date.UTC(Number(parts.year), Number(parts.month), 0),
  ).getUTCDate();
  return Number(parts.day) === lastDay;
}
