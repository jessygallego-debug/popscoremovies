import { expect, test } from "@playwright/test";
import {
  applyRatingGenreConsensus,
  resolveAutomaticRatingGenre,
} from "../../lib/rating-genre-resolver";

test("specialized horror questions beat comedy for The Menu", () => {
  const decision = resolveAutomaticRatingGenre({
    genreNames: ["Comedy", "Horror", "Thriller"],
    keywords: ["dark comedy", "food", "satirical"],
  });

  expect(decision.genre).toBe("horror");
  expect(decision.confidence).toBe("medium");
  expect(decision.alternatives).toEqual([]);
});

test("specialized horror questions beat comedy for Buddy", () => {
  const decision = resolveAutomaticRatingGenre({
    genreNames: ["Horror", "Comedy", "Fantasy"],
  });

  expect(decision.genre).toBe("horror");
  expect(decision.confidence).toBe("high");
});

test("romance and comedy use the combined Rom-Com questions", () => {
  const decision = resolveAutomaticRatingGenre({
    genreNames: ["Comedy", "Romance"],
  });

  expect(decision.genre).toBe("romcom");
  expect(decision.confidence).toBe("high");
});

test("ambiguous broad genres offer a compact user choice", () => {
  const decision = resolveAutomaticRatingGenre({
    genreNames: ["Comedy", "Drama"],
  });

  expect(decision.confidence).toBe("low");
  expect(decision.alternatives).toEqual(["comedy", "drama"]);
});

test("a qualified consensus replaces an ambiguous automatic choice", () => {
  const automatic = resolveAutomaticRatingGenre({
    genreNames: ["Mystery", "Thriller"],
  });
  const decision = applyRatingGenreConsensus(automatic, "thriller");

  expect(decision).toEqual({
    alternatives: [],
    confidence: "high",
    genre: "thriller",
    source: "consensus",
  });
});

test("an old consensus cannot replace a confident automatic classification", () => {
  const automatic = resolveAutomaticRatingGenre({
    genreNames: ["Horror", "Comedy"],
  });

  expect(applyRatingGenreConsensus(automatic, "comedy")).toEqual(automatic);
});
