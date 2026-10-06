import { test } from "node:test";
import assert from "node:assert/strict";
const { isMonthEndCollectionDay } = (await import(
  "../../lib/releases/" + "schedule.ts"
)) as typeof import("../../lib/releases/schedule");
test("one collection day for each month, including leap years", () => {
  for (const year of [2026, 2028])
    for (let month = 1; month <= 12; month++) {
      const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= days; day++) {
        assert.equal(
          isMonthEndCollectionDay(new Date(Date.UTC(year, month - 1, day, 12))),
          day === days,
          `${year}-${month}-${day}`,
        );
      }
    }
});
test("month-end follows Eastern calendar boundaries", () => {
  assert.equal(isMonthEndCollectionDay(new Date("2026-11-01T03:30:00Z")), true);
  assert.equal(
    isMonthEndCollectionDay(new Date("2026-11-01T05:30:00Z")),
    false,
  );
});
