export function normalizeMovieSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: string) {
  return normalizeMovieSearchText(value).replace(/\s+/g, "");
}

type MovieSearchProfile = {
  aliases: string[];
  canonicalTitle: string;
  franchiseTerms: string[];
  searchQueries: string[];
};

const movieSearchProfiles: MovieSearchProfile[] = [
  {
    canonicalTitle: "spider man",
    aliases: ["spider man", "spider-man", "spiderman", "spyder man"],
    franchiseTerms: ["spider man", "spider verse", "spiderverse"],
    searchQueries: ["Spider-Man", "Spider Man", "Spiderman"],
  },
  {
    canonicalTitle: "batman",
    aliases: ["batman", "bat man", "bman"],
    franchiseTerms: ["batman", "dark knight"],
    searchQueries: ["Batman", "The Batman", "Dark Knight"],
  },
  {
    canonicalTitle: "avengers",
    aliases: ["avengers", "avngers"],
    franchiseTerms: ["avengers"],
    searchQueries: ["Avengers", "The Avengers"],
  },
  {
    canonicalTitle: "jurassic park",
    aliases: ["jurassic park", "jurasic park", "jurassic world"],
    franchiseTerms: ["jurassic park", "jurassic world", "jurassic"],
    searchQueries: ["Jurassic Park", "Jurassic World"],
  },
  {
    canonicalTitle: "harry potter",
    aliases: ["harry potter", "harry poter"],
    franchiseTerms: ["harry potter", "fantastic beasts"],
    searchQueries: ["Harry Potter", "Fantastic Beasts"],
  },
  {
    canonicalTitle: "lord of the rings",
    aliases: [
      "lord of the rings",
      "lord rings",
      "lord of rings",
      "lotr",
    ],
    franchiseTerms: ["lord of the rings", "hobbit"],
    searchQueries: ["Lord of the Rings", "The Hobbit"],
  },
];

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

function isCloseSearchText(candidate: string, query: string) {
  const normalizedCandidate = normalizeMovieSearchText(candidate);
  const normalizedQuery = normalizeMovieSearchText(query);

  if (!normalizedCandidate || !normalizedQuery) {
    return false;
  }

  if (
    normalizedCandidate === normalizedQuery ||
    compactSearchText(normalizedCandidate) === compactSearchText(normalizedQuery)
  ) {
    return true;
  }

  if (
    containsWholePhrase(normalizedCandidate, normalizedQuery) ||
    containsWholePhrase(normalizedQuery, normalizedCandidate)
  ) {
    return true;
  }

  return Number.isFinite(
    fuzzyDistanceScore(
      compactSearchText(normalizedCandidate),
      compactSearchText(normalizedQuery)
    )
  );
}

function profileMatchesQuery(profile: MovieSearchProfile, query: string) {
  return [
    profile.canonicalTitle,
    ...profile.aliases,
    ...profile.franchiseTerms,
  ].some((value) => isCloseSearchText(value, query));
}

function profileMatchesMovieTitle(
  profile: MovieSearchProfile,
  normalizedTitle: string
) {
  return [profile.canonicalTitle, ...profile.franchiseTerms].some((term) => {
    const normalizedTerm = normalizeMovieSearchText(term);

    return (
      containsWholePhrase(normalizedTitle, normalizedTerm) ||
      compactSearchText(normalizedTitle).includes(compactSearchText(term))
    );
  });
}

export function getMovieSearchProfilesForQuery(query: string) {
  return movieSearchProfiles.filter((profile) =>
    profileMatchesQuery(profile, query)
  );
}

export function getMovieSearchQueries(query: string) {
  const seenQueries = new Set<string>();

  return [
    query,
    ...getMovieSearchProfilesForQuery(query).flatMap(
      (profile) => profile.searchQueries
    ),
  ].filter((searchQuery) => {
    const normalizedSearchQuery = normalizeMovieSearchText(searchQuery);

    if (!normalizedSearchQuery || seenQueries.has(normalizedSearchQuery)) {
      return false;
    }

    seenQueries.add(normalizedSearchQuery);
    return true;
  });
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

  if (compactSearchText(title) === compactSearchText(query)) {
    return 1;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return isSingleTermQuery ? 2 : 3;
  }

  if (containsWholePhrase(normalizedTitle, normalizedQuery)) {
    return 4;
  }

  const franchiseMatchScore = Math.min(
    ...getMovieSearchProfilesForQuery(query).map((profile) =>
      profileMatchesMovieTitle(profile, normalizedTitle)
        ? 8
        : Number.POSITIVE_INFINITY
    )
  );

  if (Number.isFinite(franchiseMatchScore)) {
    return franchiseMatchScore;
  }

  if (queryTerms.every((term) => titleTerms.includes(term))) {
    return 10;
  }

  if (
    queryTerms.every((term) =>
      titleTerms.some((word) => word.startsWith(term))
    )
  ) {
    return 11;
  }

  if (queryTerms.every((term) => normalizedTitle.includes(term))) {
    return 12;
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
