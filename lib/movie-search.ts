export function normalizeMovieSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactSearchText(value: string) {
  return normalizeMovieSearchText(value).replace(/\s+/g, "");
}

function containsWholePhrase(normalizedTitle: string, normalizedQuery: string) {
  return ` ${normalizedTitle} `.includes(` ${normalizedQuery} `);
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) {
    return 0;
  }

  if (!a) {
    return b.length;
  }

  if (!b) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let aIndex = 1; aIndex <= a.length; aIndex++) {
    current[0] = aIndex;

    for (let bIndex = 1; bIndex <= b.length; bIndex++) {
      const substitutionCost = a[aIndex - 1] === b[bIndex - 1] ? 0 : 1;

      current[bIndex] = Math.min(
        previous[bIndex] + 1,
        current[bIndex - 1] + 1,
        previous[bIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index < previous.length; index++) {
      previous[index] = current[index];
    }
  }

  return previous[b.length];
}

function allowedTypoDistance(length: number) {
  if (length <= 2) {
    return 0;
  }

  if (length <= 5) {
    return 1;
  }

  if (length <= 9) {
    return 2;
  }

  return 3;
}

function fuzzyDistanceScore(candidate: string, query: string) {
  if (query.length < 3 || !candidate) {
    return Number.POSITIVE_INFINITY;
  }

  const distance = levenshteinDistance(candidate, query);
  const similarity = 1 - distance / Math.max(candidate.length, query.length);

  if (
    distance <= allowedTypoDistance(query.length) ||
    (query.length >= 6 && similarity >= 0.74)
  ) {
    return distance;
  }

  return Number.POSITIVE_INFINITY;
}

export function movieTitleSearchScore(title: string, query: string) {
  const normalizedTitle = normalizeMovieSearchText(title);
  const normalizedQuery = normalizeMovieSearchText(query);
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const titleTerms = normalizedTitle.split(" ").filter(Boolean);
  const isSingleTermQuery = queryTerms.length === 1;

  if (!normalizedTitle || queryTerms.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedTitle === normalizedQuery) {
    return 0;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return isSingleTermQuery ? 0 : 1;
  }

  if (containsWholePhrase(normalizedTitle, normalizedQuery)) {
    return 2;
  }

  if (queryTerms.every((term) => titleTerms.includes(term))) {
    return 3;
  }

  if (
    queryTerms.every((term) =>
      titleTerms.some((word) => word.startsWith(term))
    )
  ) {
    return 4;
  }

  if (queryTerms.every((term) => normalizedTitle.includes(term))) {
    return 5;
  }

  const compactTitle = compactSearchText(title);
  const compactQuery = compactSearchText(query);
  const compactDistance = fuzzyDistanceScore(compactTitle, compactQuery);

  if (Number.isFinite(compactDistance)) {
    return 20 + compactDistance;
  }

  const tokenDistances = queryTerms.map((term) =>
    Math.min(
      ...titleTerms.map((word) => fuzzyDistanceScore(word, term))
    )
  );

  if (tokenDistances.every((distance) => Number.isFinite(distance))) {
    return 30 + tokenDistances.reduce((total, distance) => total + distance, 0);
  }

  return Number.POSITIVE_INFINITY;
}
