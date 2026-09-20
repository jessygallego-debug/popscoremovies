export function getPopScoreTitle(score: number) {
  if (score >= 90) {
    return {
      iconSrc: "/rating-icons/extra-buttery-v2.png",
      label: "Extra Buttery",
    };
  }

  if (score >= 75) {
    return { iconSrc: "/rating-icons/buttery.png", label: "Buttery" };
  }

  if (score >= 60) {
    return { iconSrc: "/rating-icons/fresh-popcorn.png", label: "Fresh" };
  }

  if (score >= 40) {
    return { iconSrc: "/rating-icons/salty.png", label: "Salty" };
  }

  return { iconSrc: "/rating-icons/burnt.png", label: "Burnt" };
}

export function getShareRatingStatement(score: number) {
  if (score >= 90) return "One of my all-time favorites.";
  if (score >= 80) return "Highly recommended.";
  if (score >= 70) return "Definitely worth watching.";
  if (score >= 60) return "Worth a watch.";
  return "Didn't quite work for me.";
}
