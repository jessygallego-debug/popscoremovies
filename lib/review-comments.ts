export const REVIEW_COMMENT_MAX_LENGTH = 300;

const PROFANITY_PATTERNS = [
  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /\bsh[i1]t\w*/i,
  /\bb[i1]tch\w*/i,
  /\basshole\w*/i,
  /\bcunt\w*/i,
  /\bwhore\w*/i,
  /\bslut\w*/i,
  /\bdick\w*/i,
  /\bbastard\w*/i,
  /\bmotherfucker\w*/i,
];

export function normalizeReviewComment(comment: string) {
  return comment.replace(/\s+/g, " ").trim();
}

export function containsProfanity(comment: string) {
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(comment));
}

export function validateReviewComment(comment: string): {
  error: string | null;
  reviewComment: string | null;
} {
  const reviewComment = normalizeReviewComment(comment);

  if (!reviewComment) {
    return {
      error: null,
      reviewComment: null,
    };
  }

  if (reviewComment.length > REVIEW_COMMENT_MAX_LENGTH) {
    return {
      error: `Review comments must be ${REVIEW_COMMENT_MAX_LENGTH} characters or fewer.`,
      reviewComment: null,
    };
  }

  if (containsProfanity(reviewComment)) {
    return {
      error: "Please keep comments clean before submitting.",
      reviewComment: null,
    };
  }

  return {
    error: null,
    reviewComment,
  };
}
