type QuestionKey = { key: string };

export function isDocumentaryQuestionnaire(genre: string, questions: readonly QuestionKey[]) {
  if (genre.trim().toLowerCase() !== "documentary" || questions.length !== 4) return false;
  const keys = new Set(questions.map(question => question.key));
  return keys.size === 4 &&
    ["story", "informativeValue", "presentation", "rewatchability"].every(key => keys.has(key));
}

export function ratingToPercent(rating: number, genre = "", questions: readonly QuestionKey[] = []) {
  // The four-question shape identifies the new documentary scale. Historic five-question
  // submissions retain their original scale and saved weights.
  if (isDocumentaryQuestionnaire(genre, questions)) {
    return Math.min(1, Math.max(0, (rating - 1) / 4));
  }
  const anchors = [
    { rating: 1, percent: 0 },
    { rating: 2, percent: 0.4 },
    { rating: 3, percent: 0.6 },
    { rating: 4, percent: 0.8 },
    { rating: 5, percent: 1 },
  ];
  if (rating <= anchors[0].rating) return anchors[0].percent;
  if (rating >= anchors[anchors.length - 1].rating) return anchors[anchors.length - 1].percent;
  const upperIndex = anchors.findIndex(anchor => rating <= anchor.rating);
  const lower = anchors[upperIndex - 1], upper = anchors[upperIndex];
  const rangeProgress = (rating - lower.rating) / (upper.rating - lower.rating);
  return lower.percent + (upper.percent - lower.percent) * rangeProgress;
}
