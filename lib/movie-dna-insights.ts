import type { MovieDnaRating } from "./movie-dna";
import { GENRE_RATING_CONFIGS, type GenreKey } from "./genre-rating-config";
import { normalizeProfileGenreKey } from "./profile-config";
import { isDocumentaryQuestionnaire, ratingToPercent } from "./rating-score";

export const MOVIE_DNA_VERSION = 3;
export type DnaStage = "forming" | "early" | "developing" | "established";
export type DnaSignal = {
  key: string; label: string; count: number; favoriteCount: number;
  baseline: number; favorites: number; lift: number; consistency: number;
  correlation: number; confidence: number;
};
export type DnaTrait = { key: string; label: string; explanation: string; confidence: number };
export type DnaCandidate = { name: string; family: string; confidence: number; description: string };
export type MovieDnaInsights = {
  algorithmVersion: number; stage: DnaStage; confidence: number;
  favoriteMovieIds: string[]; favoriteMethod: "90-plus" | "personal-top";
  dimensionSignals: DnaSignal[]; genreSignals: DnaSignal[]; eraSignals: DnaSignal[];
  candidates: DnaCandidate[]; loveTraits: DnaTrait[];
  personality: string | null; personalityLabel: string; personalityDescription: string;
  strongestTrait: "Storyline" | "Acting" | "Rewatch Score" | null;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const genreKey = (r: MovieDnaRating) => normalizeProfileGenreKey(r.genre);
function movieGenres(r: MovieDnaRating) {
  return new Set([genreKey(r), ...(r.genreNames ?? []).map(normalizeProfileGenreKey)]
    .filter(key => key && key in GENRE_RATING_CONFIGS));
}
const core = new Set(["story", "acting", "rewatchability"]);
function repeatsPersonality(key: string, family: string): boolean {
  if (family.includes("+")) return family.split("+").some(part => repeatsPersonality(key, part));
  const pattern = key.startsWith("genre:") ? key.slice(6) : key.split(":")[0];
  const groups: Record<string, string[]> = {
    horror: ["horror"], comedy: ["comedy", "romcom"], thrills: ["horror", "action", "thriller"],
    escapism: ["fantasy", "scifi", "animated"], variety: ["variety"],
  };
  return pattern === family || groups[family]?.includes(pattern) === true;
}

function questionScore(rating: MovieDnaRating, key: string) {
  let value: number | undefined;
  if (key === "acting") {
    if (isDocumentaryQuestionnaire(rating.genre, rating.weights)) return null;
    value = rating.ratings.acting ?? rating.ratings.voiceActing ?? rating.ratings.character;
  } else value = rating.ratings[key];
  if (!Number.isFinite(value) || value! < 1 || value! > 5) return null;
  return ratingToPercent(value!, rating.genre, rating.weights) * 100;
}

function correlation(pairs: { value: number; score: number }[]) {
  const x = mean(pairs.map(p => p.value)), y = mean(pairs.map(p => p.score));
  const numerator = pairs.reduce((sum, p) => sum + (p.value - x) * (p.score - y), 0);
  const denominator = Math.sqrt(pairs.reduce((sum, p) => sum + (p.value - x) ** 2, 0)
    * pairs.reduce((sum, p) => sum + (p.score - y) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

function dimension(ratings: MovieDnaRating[], favorites: Set<string>, key: string, label: string, question: string): DnaSignal {
  const pairs = ratings.map(r => ({ value: questionScore(r, question), score: r.popscore, favorite: favorites.has(r.movieId) }))
    .filter((p): p is typeof p & { value: number } => p.value !== null);
  const selected = pairs.filter(p => p.favorite);
  const baseline = mean(pairs.map(p => p.value)), favoriteAverage = mean(selected.map(p => p.value));
  const consistency = mean(selected.map(p => p.value > baseline ? 1 : 0));
  const lift = selected.length ? favoriteAverage - baseline : 0;
  const reliability = Math.sqrt(pairs.length / (pairs.length + 10) * selected.length / (selected.length + 3));
  const corr = correlation(pairs);
  const confidence = selected.length >= 3 && pairs.length - selected.length >= 3 && lift >= 5 && consistency >= 0.6
    ? reliability * (0.6 * clamp(lift / 25) + 0.25 * consistency + 0.15 * clamp(corr)) : 0;
  return { key, label, count: pairs.length, favoriteCount: selected.length, baseline, favorites: favoriteAverage, lift, consistency, correlation: corr, confidence };
}

function categorySignal(ratings: MovieDnaRating[], favorites: Set<string>, key: string, label: string, match: (r: MovieDnaRating) => boolean): DnaSignal {
  const matches = ratings.filter(match), selected = matches.filter(r => favorites.has(r.movieId));
  const baseline = matches.length / Math.max(1, ratings.length), favoriteShare = selected.length / Math.max(1, favorites.size);
  const scoreLift = mean(matches.map(r => r.popscore)) - mean(ratings.map(r => r.popscore));
  const lift = favoriteShare - baseline;
  // Volume, favorite concentration and above-baseline scores must agree.
  const confidence = matches.length >= 6 && selected.length >= 3 && ratings.length - matches.length >= 3
    && lift >= 0.1 && scoreLift >= 2
    ? Math.sqrt(matches.length / (matches.length + 6) * selected.length / (selected.length + 3))
      * (0.5 * clamp(lift / 0.35) + 0.3 * clamp(scoreLift / 15) + 0.2 * clamp(matches.length / 25)) : 0;
  return { key, label, count: matches.length, favoriteCount: selected.length, baseline: baseline * 100,
    favorites: favoriteShare * 100, lift: lift * 100, consistency: selected.length / Math.max(1, matches.length), correlation: scoreLift, confidence };
}

function analyze(ratings: MovieDnaRating[], now: Date) {
  const sorted = [...ratings].sort((a, b) => b.popscore - a.popscore || a.movieId.localeCompare(b.movieId));
  const high = sorted.filter(r => r.popscore >= 90);
  const favoriteMethod = high.length >= 5 ? "90-plus" as const : "personal-top" as const;
  const target = Math.min(Math.max(3, Math.ceil(sorted.length * 0.2)), Math.max(0, sorted.length - 3));
  const cutoff = sorted[target - 1]?.popscore ?? Infinity;
  // Include score ties instead of arbitrarily selecting movies by title or date.
  let selected = favoriteMethod === "90-plus" ? high : sorted.filter(r => r.popscore >= cutoff);
  const strictlyAbove = sorted.filter(r => r.popscore > cutoff);
  // A large tie at the cutoff can swallow the entire baseline. Keep the clearly
  // higher group when it is already a useful sample, without splitting ties.
  if (favoriteMethod === "personal-top" && selected.length > Math.max(target * 1.5, sorted.length * 0.35)
    && strictlyAbove.length >= 3) selected = strictlyAbove;
  const favorites = new Set(selected.map(r => r.movieId));
  const usable = favorites.size >= 3 && ratings.length - favorites.size >= 3
    && mean(selected.map(r => r.popscore)) - mean(ratings.map(r => r.popscore)) >= 3;
  const dimensions = [dimension(ratings, favorites, "story", "Storyline", "story"),
    dimension(ratings, favorites, "acting", "Acting", "acting"),
    dimension(ratings, favorites, "rewatchability", "Rewatch Score", "rewatchability")];
  for (const [key, config] of Object.entries(GENRE_RATING_CONFIGS)) {
    const withinGenre = ratings.filter(r => genreKey(r) === key);
    for (const question of config.questions) {
      if (["story", "acting", "voiceActing", "character", "rewatchability"].includes(question.key)) continue;
      dimensions.push(dimension(withinGenre, favorites, `${key}:${question.key}`, `${config.title}: ${question.name}`, question.key));
    }
  }
  const genreSignals = Object.entries(GENRE_RATING_CONFIGS).map(([key, config]) =>
    categorySignal(ratings, favorites, `genre:${key}`, config.title, r => movieGenres(r).has(key)));
  const currentYear = now.getUTCFullYear();
  const year = (r: MovieDnaRating) => {
    if (!r.releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate) || !Number.isFinite(Date.parse(r.releaseDate))) return null;
    const value = Number(r.releaseDate.slice(0, 4));
    return value >= 1888 && value <= currentYear ? value : null;
  };
  const dated = ratings.filter(r => year(r) !== null);
  const eraSignals = dated.length >= Math.ceil(ratings.length * 0.7) ? [
    categorySignal(dated, favorites, "era:modern", "Modern Movies", r => year(r)! >= currentYear - 14),
    categorySignal(dated, favorites, "era:classic", "Classics", r => year(r)! < currentYear - 24),
    ...Array.from(new Set(dated.map(r => Math.floor(year(r)! / 10) * 10))).sort().map(decade =>
      categorySignal(dated, favorites, `era:${decade}`, `${decade}s Movies`, r => Math.floor(year(r)! / 10) * 10 === decade)),
  ] : [];
  const candidates: DnaCandidate[] = [];
  const add = (name: string, family: string, confidence: number, description: string) => {
    if (confidence > 0) candidates.push({ name, family, confidence, description });
  };
  const coreSignals = dimensions.filter(d => core.has(d.key));
  for (const d of coreSignals) {
    const peerLift = mean(coreSignals.filter(p => p.key !== d.key && p.count >= 6).map(p => p.lift));
    // Correlation alone is insufficient: PopScore itself includes these questions.
    const distinction = clamp((d.lift - peerLift) / 15);
    const confidence = d.lift - peerLift >= 3 ? d.confidence * (0.7 + 0.3 * distinction) : 0;
    if (d.key === "story") add("Story Seeker", "story", confidence, "Storytelling improves more than other qualities among your favorites, compared with your usual ratings.");
    if (d.key === "acting") add("The Character Loyalist", "acting", confidence, "Performances and characters consistently stand out in the movies you rate highest.");
    if (d.key === "rewatchability") add("The Rewatcher", "rewatchability", confidence, "Wanting to watch a movie again is a distinctive pattern in your highest ratings.");
  }
  const strongestQuestion = (keys: string[]) => Math.max(0, ...dimensions.filter(d => keys.includes(d.key)).map(d => d.confidence));
  const genreCandidate = (name: string, family: string, keys: GenreKey[], questions: string[], description: string) => {
    const combined = categorySignal(ratings, favorites, `group:${family}`, name, r => keys.some(key => movieGenres(r).has(key)));
    add(name, family, combined.confidence * 0.85 + strongestQuestion(questions) * 0.15 * (combined.confidence > 0 ? 1 : 0), description);
  };
  genreCandidate("The Horror Devotee", "horror", ["horror"], ["horror:scareFactor", "horror:originality"], "Horror is a substantial part of your viewing, and it appears especially often among your highest-rated movies.");
  genreCandidate("The Laugh Seeker", "comedy", ["comedy", "romcom"], ["comedy:humor", "romcom:humor", "comedy:quotability"], "Comedies consistently outperform your usual scores and make up an outsized share of your favorites.");
  genreCandidate("The Thrill Chaser", "thrills", ["action", "thriller", "horror"], ["action:actionSequences", "thriller:suspense", "horror:scareFactor"], "Action, horror and suspense appear disproportionately in the movies you love.");
  genreCandidate("The Escapist", "escapism", ["fantasy", "scifi", "animated"], ["fantasy:worldBuilding", "fantasy:magicWonder", "scifi:visualEffects", "animated:animationQuality"], "Fantasy, science fiction and animation consistently stand out among your favorites.");
  const rewatch = candidates.find(c => c.family === "rewatchability");
  const concentration = Math.max(0, ...genreSignals.map(g => g.favorites / 100));
  if (rewatch && concentration >= 0.6 && genreSignals.some(g => g.count >= 8 && g.favoriteCount >= 3)) {
    add("The Comfort Watcher", "rewatchability", Math.min(1, rewatch.confidence + 0.04), "Your favorites combine unusually strong rewatch scores with a recurring preference for familiar genres.");
  }
  const substantialGenres = genreSignals.filter(g => g.count >= 3);
  const favoriteGenres = genreSignals.filter(g => g.favoriteCount >= 1);
  const broad = ratings.length >= 20 && substantialGenres.length >= 5 && favoriteGenres.length >= 4
    && concentration <= 0.4 && genreSignals.every(g => g.baseline <= 40);
  if (broad) {
    const decades = new Set(selected.filter(r => year(r) !== null).map(r => Math.floor(year(r)! / 10)));
    const adventurous = dated.length >= ratings.length * 0.7 && decades.size >= 4;
    add(adventurous ? "The Movie Adventurer" : "The Genre Explorer", "variety",
      Math.min(0.72, 0.4 + ratings.length / 250 + substantialGenres.length / 100), adventurous
        ? "Your favorites span a wide range of genres and release decades, without one style dominating."
        : "You consistently enjoy favorites from many genres, without one genre dominating your taste.");
  }
  // Keep specialist labels above a broader label when they share the same evidence.
  const specialist = candidates.find(c => c.family === "horror");
  const thrills = candidates.find(c => c.family === "thrills");
  if (specialist && thrills && specialist.confidence >= thrills.confidence * 0.85) thrills.confidence *= 0.8;
  candidates.sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
  let winner = usable && ratings.length >= 10 && candidates[0]?.confidence >= 0.35
    && (!candidates[1] || candidates[0].confidence - candidates[1].confidence >= 0.035
      || candidates[0].family === candidates[1].family) ? candidates[0] : null;
  if (!winner && usable && ratings.length >= 10 && candidates[0]?.confidence >= 0.35
    && candidates[1]?.confidence >= 0.35 && candidates[0].confidence - candidates[1].confidence < 0.035) {
    const pair = candidates.slice(0, 2).sort((a, b) => a.family.localeCompare(b.family));
    winner = { name: pair.map(c => c.name.replace(/^The /, "")).join(" + "),
      family: pair.map(c => c.family).join("+"), confidence: Math.min(...pair.map(c => c.confidence)),
      description: `Your personality blends ${pair.map(c => c.name.replace(/^The /, "")).join(" and ")}. ${pair.map(c => c.description).join(" ")}` };
  }
  const traits: DnaTrait[] = [];
  for (const g of genreSignals.filter(g => g.confidence >= 0.3)) {
    const duplicate = winner && ((winner.family === "horror" && g.key === "genre:horror")
      || (winner.family === "comedy" && ["genre:comedy", "genre:romcom"].includes(g.key))
      || (winner.family === "thrills" && ["genre:action", "genre:thriller", "genre:horror"].includes(g.key))
      || (winner.family === "escapism" && ["genre:fantasy", "genre:scifi", "genre:animated"].includes(g.key)));
    if (!duplicate) traits.push({ key: g.key, label: g.label === "Comedy" ? "Comedies" : `${g.label} Movies`, confidence: g.confidence,
      explanation: `${g.label} appears more often among your favorites and scores above your personal average.` });
  }
  for (const d of dimensions.filter(d => d.confidence >= 0.35)) {
    if (core.has(d.key) && d.lift - mean(coreSignals.filter(p => p.key !== d.key && p.count >= 6).map(p => p.lift)) < 3) continue;
    if (winner?.family === d.key || (winner?.family === "horror" && d.key.startsWith("horror:"))) continue;
    const label = d.key === "story" ? "Strong Storytelling" : d.key === "acting" ? "Big Performances" : d.key === "rewatchability" ? "Rewatchable Movies" : d.label;
    traits.push({ key: d.key, label, confidence: d.confidence, explanation: `${d.label} scores average ${Math.round(d.lift)} points higher in your favorites than in your usual ratings.` });
  }
  for (const era of eraSignals.filter(e => e.confidence >= 0.35)) traits.push({ key: era.key, label: era.label, confidence: era.confidence,
    explanation: `${era.label} appear disproportionately among your favorites and score above your usual average.` });
  if (broad && winner?.family !== "variety") traits.push({ key: "variety", label: "Genre Variety", confidence: 0.45,
    explanation: "Your favorite movies span several genres without one genre dominating." });
  traits.sort((a, b) => b.confidence - a.confidence || a.key.localeCompare(b.key));
  // Multiple era labels describe the same underlying pattern; keep only one.
  let hasEra = false;
  const seen = new Set<string>();
  const loveTraits = usable && ratings.length >= 10 ? traits.filter(t => {
    if (winner && repeatsPersonality(t.key, winner.family)) return false;
    const family = t.key.startsWith("genre:") ? t.key.slice(6) : t.key.includes(":") ? t.key.split(":")[0] : t.key;
    if (seen.has(family)) return false;
    seen.add(family);
    if (!t.key.startsWith("era:")) return true;
    if (hasEra) return false;
    hasEra = true; return true;
  }).slice(0, 3) : [];
  return { favoriteMethod, selected, dimensions, genreSignals, eraSignals, candidates, winner, loveTraits };
}

export function inferMovieDna(ratings: MovieDnaRating[], now = new Date()): MovieDnaInsights {
  // Imported overall scores may inform existing summary charts, but never invent question answers.
  const native = ratings.filter(r => !r.ratingSource?.toLowerCase().includes("letterboxd"));
  const result = analyze(native, now);
  let winner = result.winner;
  // A single newest movie must not create a new established personality.
  if (native.length >= 15) {
    const previous = [...native].sort((a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at) || a.movieId.localeCompare(b.movieId)).slice(1);
    const prior = analyze(previous, now).winner;
    if (!prior) winner = null;
    else if (!winner || prior.family !== winner.family) winner = prior;
  }
  const confidence = winner?.confidence ?? Math.max(0, ...result.loveTraits.map(t => t.confidence));
  const stage: DnaStage = native.length < 5 ? "forming" : native.length < 15 ? "early"
    : native.length < 30 || confidence < 0.55 ? "developing" : "established";
  return { algorithmVersion: MOVIE_DNA_VERSION, stage, confidence,
    favoriteMovieIds: result.selected.map(r => r.movieId), favoriteMethod: result.favoriteMethod,
    dimensionSignals: result.dimensions, genreSignals: result.genreSignals, eraSignals: result.eraSignals,
    candidates: result.candidates, loveTraits: result.loveTraits.filter(t => !winner || !repeatsPersonality(t.key, winner.family)),
    personality: winner?.name ?? null,
    personalityLabel: winner?.name ?? (native.length >= 30 ? "Your Taste Has Many Sides" : native.length >= 10 ? "Your Movie Taste Is Taking Shape" : "Still forming"),
    personalityDescription: winner ? `${stage === "established" ? "" : "An emerging pattern: "}${winner.description}`
      : native.length >= 30 ? "You have an established rating history, but no single personality stands out clearly. Your preferences can span several styles without fitting one label."
      : "Keep rating movies and PopScore will learn what separates the movies you like from the movies you love.",
    strongestTrait: winner?.family === "story" ? "Storyline" : winner?.family === "acting" ? "Acting" : winner?.family === "rewatchability" ? "Rewatch Score" : null,
  };
}
