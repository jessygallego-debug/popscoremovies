import { expect, test } from "@playwright/test";
import {
  getCurrentRatingStreak,
  getLongestRatingStreak,
} from "../../lib/rating-streaks";

const ratingOn = (created_at: string) => ({ created_at });

test("longest streak keeps the best historical run and counts one day once", () => {
  const ratings = [
    ratingOn("2026-08-01T10:00:00"),
    ratingOn("2026-08-01T20:00:00"),
    ratingOn("2026-08-02T12:00:00"),
    ratingOn("2026-08-03T12:00:00"),
    ratingOn("2026-08-08T12:00:00"),
  ];

  expect(getLongestRatingStreak(ratings)).toBe(3);
});

test("current streak continues when the latest rating is today", () => {
  const ratings = [
    ratingOn("2026-09-06T12:00:00"),
    ratingOn("2026-09-07T12:00:00"),
    ratingOn("2026-09-08T12:00:00"),
  ];

  expect(
    getCurrentRatingStreak(ratings, new Date("2026-09-08T18:00:00"))
  ).toBe(3);
});

test("current streak has a one-day grace period", () => {
  const ratings = [
    ratingOn("2026-09-06T12:00:00"),
    ratingOn("2026-09-07T12:00:00"),
  ];

  expect(
    getCurrentRatingStreak(ratings, new Date("2026-09-08T08:00:00"))
  ).toBe(2);
});

test("current streak resets after a full missed calendar day", () => {
  const ratings = [
    ratingOn("2026-09-05T12:00:00"),
    ratingOn("2026-09-06T12:00:00"),
  ];

  expect(
    getCurrentRatingStreak(ratings, new Date("2026-09-08T08:00:00"))
  ).toBe(0);
});
