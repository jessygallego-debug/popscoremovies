export type RatingInfoCopy = {
  description: string;
  title: string;
};

export const ratingInfoCopy: Record<string, RatingInfoCopy> = {
  actionSequences: {
    title: "Action Sequences",
    description:
      "How exciting and well-made were the stunts, fights, chases, battles, or big action moments? Think about clarity, energy, impact, and payoff.",
  },
  acting: {
    title: "Acting",
    description:
      "How strong were the performances? Think about emotion, believability, chemistry, and how well the actors brought the characters to life.",
  },
  animationQuality: {
    title: "Animation Quality",
    description:
      "How strong did the animation look and feel? Think about visual style, movement, character design, color, and how well the animation supported the story.",
  },
  battleScenes: {
    title: "Battle Scenes",
    description:
      "How powerful were the battle scenes? Think about scale, tension, clarity, emotion, realism, and how much the conflict mattered.",
  },
  character: {
    title: "Character",
    description:
      "How memorable were the characters? Think about personality, growth, motivation, relationships, and whether they stayed with you after the movie.",
  },
  chemistry: {
    title: "Chemistry",
    description:
      "How well did the leads connect on screen? Think about romantic spark, timing, emotional pull, and whether the relationship felt believable.",
  },
  choreography: {
    title: "Choreography",
    description:
      "How well did the movement, dance, staging, or musical numbers land? Think about rhythm, creativity, performance, and how memorable the sequences felt.",
  },
  conflict: {
    title: "Conflict",
    description:
      "How strong was the central struggle? Think about the stakes, character choices, emotional pressure, and whether the drama felt meaningful.",
  },
  emotionalImpact: {
    title: "Emotional Impact",
    description:
      "How much did the movie make you feel? Think about heart, sadness, joy, tension, inspiration, and whether the emotional moments stayed with you.",
  },
  excitement: {
    title: "Excitement",
    description:
      "How fun and thrilling was the journey? Think about momentum, danger, surprises, set pieces, and how much the movie kept you invested.",
  },
  exploration: {
    title: "Exploration",
    description:
      "How strong was the sense of discovery? Think about new places, adventure, obstacles, wonder, and how satisfying the journey felt.",
  },
  familyEnjoyment: {
    title: "Family Enjoyment",
    description:
      "How well did the movie work for family viewing? Think about fun, warmth, age appeal, positive energy, and whether different viewers could enjoy it together.",
  },
  heartWarmth: {
    title: "Heart/Warmth",
    description:
      "How warm and heartfelt was the movie? Think about kindness, comfort, emotional connection, family themes, and feel-good moments.",
  },
  humor: {
    title: "Humor",
    description:
      "How funny was the movie? Think about joke quality, timing, character comedy, memorable laughs, and whether the humor stayed enjoyable.",
  },
  impact: {
    title: "Impact",
    description:
      "How much did the documentary stay with you? Think about emotional weight, importance, perspective, and whether it changed how you saw the subject.",
  },
  informativeValue: {
    title: "Informative Value",
    description:
      "How much did you learn? Think about facts, clarity, research, context, and whether the documentary helped you understand the topic better.",
  },
  intrigue: {
    title: "Intrigue",
    description:
      "How well did the mystery keep you curious? Think about clues, secrets, questions, suspects, and how strongly you wanted answers.",
  },
  magicWonder: {
    title: "Magic & Wonder",
    description:
      "How well did the movie deliver magic, adventure, creatures, or a sense of wonder? Think about imagination, spectacle, and fantasy excitement.",
  },
  mysteryPayoff: {
    title: "Mystery Payoff",
    description:
      "How satisfying were the answers? Think about the reveal, clues, twists, logic, and whether the ending made the mystery feel worth it.",
  },
  originality: {
    title: "Originality",
    description:
      "How fresh or unique did the movie feel? Think about new ideas, memorable choices, surprises, and whether it avoided feeling too predictable.",
  },
  pace: {
    title: "Pace",
    description:
      "How well did the movie keep moving? Think about momentum, slow spots, scene length, energy, and whether the story held your attention.",
  },
  quotability: {
    title: "Quotability",
    description:
      "How memorable were the funny lines or moments? Think about jokes you would repeat, scenes you remember, and comedy that sticks after watching.",
  },
  rewatchability: {
    title: "Rewatch Score",
    description:
      "How likely are you to watch this movie again? A higher score means it has strong replay value and still feels enjoyable after the first watch.",
  },
  scareFactor: {
    title: "Scare Factor",
    description:
      "How scary, tense, or unsettling was the movie? Think about fear, dread, jump scares, atmosphere, and whether it kept you on edge.",
  },
  showdowns: {
    title: "Showdowns",
    description:
      "How exciting were the standoffs, shootouts, duels, chases, or confrontations? Think about tension, payoff, and memorable Western moments.",
  },
  songQuality: {
    title: "Song Quality",
    description:
      "How memorable and enjoyable were the songs? Think about melody, lyrics, performance, emotion, and whether the music stayed with you.",
  },
  story: {
    title: "Storyline",
    description:
      "How strong was the movie's story? Think about the plot, pacing, conflict, twists, and how satisfying the ending felt.",
  },
  suspense: {
    title: "Suspense",
    description:
      "How well did the movie keep you on edge? Think about uncertainty, danger, tension, reveals, and whether you felt pulled forward.",
  },
  tension: {
    title: "Tension",
    description:
      "How well did the pressure build and hold? Think about conflict, emotional strain, stakes, silence, timing, and dramatic release.",
  },
  tensionPacing: {
    title: "Tension/Pacing",
    description:
      "How well did the movie balance tension and momentum? Think about suspense, timing, twists, slow burns, and whether the pace kept you hooked.",
  },
  visualEffects: {
    title: "Visual Effects",
    description:
      "How convincing and exciting were the effects? Think about realism, spectacle, creature or tech design, and how well the visuals supported the story.",
  },
  voiceActing: {
    title: "Voice Acting",
    description:
      "How strong were the voice performances? Think about emotion, personality, humor, and how well the voices brought the animated characters to life.",
  },
  westernAtmosphere: {
    title: "Western Atmosphere",
    description:
      "How well did the movie capture the Western setting, tone, and feel? Think about the frontier world, landscapes, towns, costumes, music, and overall Old West atmosphere.",
  },
  worldBuilding: {
    title: "World Building",
    description:
      "How immersive was the fantasy world? Think about the lore, setting, mythology, creatures, rules, and how believable the world felt.",
  },
};

export function ratingInfoForKey(key: string, fallbackTitle: string) {
  return (
    ratingInfoCopy[key] ?? {
      title: fallbackTitle,
      description: `Learn what to consider when rating ${fallbackTitle.toLowerCase()}.`,
    }
  );
}
