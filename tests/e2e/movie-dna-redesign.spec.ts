import { expect, test } from "@playwright/test";
import { calculateMovieDna, type MovieDnaRating } from "../../lib/movie-dna";
import { inferMovieDna } from "../../lib/movie-dna-insights";
import { GENRE_RATING_CONFIGS, type GenreKey } from "../../lib/genre-rating-config";

function movie(id: number, genre: GenreKey = "drama", score = 75, answers: Record<string, number> = {}): MovieDnaRating {
  const config = GENRE_RATING_CONFIGS[genre];
  return { id: String(id), movieId: String(id), movieTitle: `Movie ${id}`, genre,
    popscore: score, ratings: Object.fromEntries(config.questions.map(q => [q.key, answers[q.key] ?? 4])),
    weights: config.questions.map(q => ({ key: q.key, weight: q.weight })),
    created_at: new Date(Date.UTC(2025, 0, id)).toISOString(), updated_at: new Date(Date.UTC(2025, 0, id)).toISOString(),
    releaseDate: "2020-01-01" };
}
function rewatchHistory(harsh = false) {
  return Array.from({ length: 40 }, (_, i) => movie(i + 1, (["drama", "action", "comedy", "animated"] as GenreKey[])[i % 4],
    i < 32 ? (harsh ? 60 : 75) : (harsh ? 86 : 96),
    { story: i < 32 ? 4.7 : 4.8, acting: 4, voiceActing: 4, rewatchability: i < 32 ? 2 : 5 }));
}

test("favorites lift identifies rewatchability despite a higher Storyline baseline", () => {
  const dna = calculateMovieDna(rewatchHistory());
  expect(dna.storyAverage).toBeGreaterThan(dna.rewatchAverage);
  expect(dna.personality).toBe("The Rewatcher");
  expect(dna.favoriteMethod).toBe("90-plus");
  expect(dna.favoriteMovieIds).toHaveLength(8);
  expect(dna.loveTraits.map(t => t.key)).not.toContain("rewatchability");
  expect(dna.loveTraits.length).toBeLessThanOrEqual(3);
});
test("harsh graders get a personal top cohort without an absolute 90 requirement", () => {
  const dna = calculateMovieDna(rewatchHistory(true));
  expect(dna.favoriteMethod).toBe("personal-top");
  expect(dna.favoriteMovieIds).toHaveLength(8);
  expect(dna.personality).toBe("The Rewatcher");
});
test("uniform high scores and uniformly high Storyline do not force personalities", () => {
  const dna = calculateMovieDna(Array.from({ length: 40 }, (_, i) => movie(i + 1, "drama", 96, { story: 5 })));
  expect(dna.personality).toBeNull();
  expect(dna.loveTraits).toEqual([]);
  expect(dna.personalityLabel).toBe("Your Taste Has Many Sides");
  expect(dna.personalityDescription).toContain("established rating history");
});
test("strong close personalities become a stable blend instead of forming", () => {
  const genres: GenreKey[] = ["drama", "action", "comedy", "animated", "scifi", "horror"];
  const histories = Array.from({ length: 100 }, (_, step) => Array.from({ length: 230 }, (_, i) => ({
    ...movie(i + 1, genres[i % genres.length], i < 115 ? 75 : 96,
      { story: 4.5, acting: 4.5, voiceActing: 4.5, rewatchability: i < 115 ? 2 + step / 50 : 5 }),
    releaseDate: `${1960 + (i % 6) * 10}-01-01`,
  })));
  const history = histories.find(ratings => calculateMovieDna(ratings).personality?.includes(" + "));
  expect(history).toBeDefined();
  const dna = calculateMovieDna(history!);
  expect(dna.personalityLabel).toContain("Rewatcher");
  expect(dna.personalityLabel).toContain("Movie Adventurer");
  expect(dna.personalityDescription).toContain("blends");
  expect(dna.loveTraits.map(t => t.key)).not.toContain("rewatchability");
  expect(calculateMovieDna([...history!].reverse()).personalityLabel).toBe(dna.personalityLabel);
});
test("small samples stay forming even with impressive scores", () => {
  for (const count of [0, 4, 6, 9]) {
    const dna = calculateMovieDna(rewatchHistory().slice(-count || 40));
    expect(dna.personality).toBeNull();
    expect(dna.loveTraits).toEqual([]);
    expect(Number.isFinite(dna.confidence)).toBe(true);
  }
});
test("generic improvement in every question does not become Story Seeker", () => {
  const ratings = Array.from({ length: 40 }, (_, i) => movie(i + 1, "drama", i < 32 ? 65 : 98,
    { story: i < 32 ? 3 : 5, acting: i < 32 ? 3 : 5, rewatchability: i < 32 ? 3 : 5 }));
  expect(calculateMovieDna(ratings).personality).toBeNull();
  expect(calculateMovieDna(ratings).loveTraits).toEqual([]);
});
test("Story Seeker and Character Loyalist require distinctive improvements, including voice acting", () => {
  for (const key of ["story", "voiceActing"] as const) {
    const ratings = Array.from({ length: 40 }, (_, i) => movie(i + 1, "animated", i < 32 ? 70 : 96,
      { [key]: i < 32 ? 2 : 5 }));
    const dna = calculateMovieDna(ratings);
    expect(dna.personality).toBe(key === "story" ? "Story Seeker" : "The Character Loyalist");
  }
});
test("existing multi-genre metadata contributes once per movie without inventing tags", () => {
  const ratings = Array.from({ length: 40 }, (_, i) => ({ ...movie(i + 1, "drama", i < 32 ? 70 : 96),
    genreNames: i < 32 ? ["Drama"] : ["Drama", "Science Fiction", "Science Fiction"] }));
  const dna = calculateMovieDna(ratings);
  expect(dna.genreSignals.find(g => g.key === "genre:scifi")?.count).toBe(8);
  expect(dna.personality).toBe("The Escapist");
  expect(dna.loveTraits.some(t => /superhero|franchise|dark horror/i.test(t.label))).toBe(false);
});
test("a strong horror personality needs volume, concentration and performance", () => {
  const ratings = Array.from({ length: 100 }, (_, i) => {
    const horror = i < 40;
    const favorite = horror ? i < 11 : i < 49;
    return movie(i + 1, horror ? "horror" : "drama", favorite ? 96 : horror ? 83 : 65,
      { scareFactor: favorite ? 5 : 3 });
  });
  const dna = calculateMovieDna(ratings);
  expect(dna.personality).toBe("The Horror Devotee");
  expect(dna.loveTraits.map(t => t.key)).not.toContain("genre:horror");
  expect(dna.genreSignals.find(g => g.key === "genre:horror")?.favoriteCount).toBe(11);
  expect(dna.dimensionSignals.find(d => d.key === "horror:scareFactor")?.confidence).toBeGreaterThan(0);
  const tiny = ratings.filter(r => r.genre !== "horror").concat(ratings.slice(0, 3));
  expect(calculateMovieDna(tiny).personality).not.toBe("The Horror Devotee");
});
test("one or two new comedies cannot overturn substantial horror history", () => {
  const history = Array.from({ length: 100 }, (_, i) => movie(i + 1, i < 40 ? "horror" : "drama",
    i < 12 ? 96 : i < 40 ? 84 : i < 48 ? 95 : 60, { scareFactor: i < 12 ? 5 : 3 }));
  const before = calculateMovieDna(history);
  expect(before.personality).toBe("The Horror Devotee");
  const after = calculateMovieDna([...history, movie(101, "comedy", 99, { humor: 5 }), movie(102, "comedy", 99, { humor: 5 })]);
  expect(after.personality).toBe(before.personality);
});
test("genre-specific questions require both favorites and comparison movies within that genre", () => {
  const ratings = rewatchHistory().concat([movie(41, "horror", 99, { scareFactor: 5 }), movie(42, "horror", 99, { scareFactor: 5 })]);
  expect(calculateMovieDna(ratings).dimensionSignals.find(d => d.key === "horror:scareFactor")?.confidence).toBe(0);
});
test("documentaries omit Acting and respect their different score scale", () => {
  const ratings = Array.from({ length: 40 }, (_, i) => movie(i + 1, "documentary", i < 32 ? 60 : 98,
    { story: 4, rewatchability: i < 32 ? 2 : 5 }));
  const dna = calculateMovieDna(ratings);
  expect(dna.actingAverage).toBe(0);
  expect(dna.dimensionSignals.find(d => d.key === "acting")?.count).toBe(0);
  expect(dna.dimensionSignals.find(d => d.key === "rewatchability")?.baseline).toBe(40);
  expect(dna.personality).toBe("The Comfort Watcher");
});
test("imports, deleted rows, incomplete questionnaires and older duplicates cannot supply trait evidence", () => {
  const ratings = rewatchHistory();
  const base = calculateMovieDna(ratings);
  const mixed = calculateMovieDna([...ratings, { ...movie(41, "horror", 100), ratingSource: "letterboxd_import", ratings: {}, weights: [] },
    { ...movie(42, "horror", 100), deleted_at: "2026-01-01" }, { ...movie(43), ratings: { story: 5 } },
    { ...ratings[0], updated_at: "2020-01-01", ratings: { ...ratings[0].ratings, rewatchability: 5 } }]);
  expect(mixed.personality).toBe(base.personality);
  expect(mixed.dimensionSignals).toEqual(base.dimensionSignals);
});
test("missing and future release dates do not create era traits", () => {
  const ratings = rewatchHistory().map((r, i) => ({ ...r, releaseDate: i % 2 ? null : "2099-01-01" }));
  expect(calculateMovieDna(ratings).eraSignals).toEqual([]);
});
test("ties are independent of input order and do not split identically rated movies", () => {
  const ratings = rewatchHistory(true);
  const forward = calculateMovieDna(ratings), reverse = calculateMovieDna([...ratings].reverse());
  expect(reverse.personality).toBe(forward.personality);
  expect(reverse.favoriteMovieIds).toEqual(forward.favoriteMovieIds);
  expect(reverse.loveTraits).toEqual(forward.loveTraits);
});
test("established history can evolve after sustained new preferences", () => {
  const original = rewatchHistory();
  const newMovies = Array.from({ length: 40 }, (_, i) => movie(41 + i, "comedy", 99,
    { story: 4, acting: 4, rewatchability: 2, humor: 5 }));
  expect(calculateMovieDna(original).personality).toBe("The Rewatcher");
  expect(calculateMovieDna([...original, ...newMovies]).personality).toBe("The Laugh Seeker");
});
test("broad genre and era patterns use reliable dates rather than invented metadata", () => {
  const genres: GenreKey[] = ["horror", "comedy", "drama", "scifi", "fantasy", "action"];
  const ratings = Array.from({ length: 60 }, (_, i) => ({ ...movie(i + 1, genres[i % 6], i < 48 ? 70 : 96),
    releaseDate: `${1960 + (i % 6) * 10}-01-01` }));
  const dna = inferMovieDna(ratings, new Date("2026-10-07"));
  expect(dna.personality).toBe("The Movie Adventurer");
  expect(dna.loveTraits.map(t => t.key)).not.toContain("variety");
});
