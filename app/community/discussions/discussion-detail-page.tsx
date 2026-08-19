import type { Metadata } from "next";
import DiscussionDetailClient from "@/app/community/discussions/[discussionId]/discussion-detail-client";
import { getPublicCommunityDiscussion } from "@/lib/community-discussions-public";
import { SITE_KEYWORDS } from "@/lib/site-metadata";
import { absoluteUrl, truncateDescription } from "@/lib/site-url";
import { posterUrl } from "@/lib/tmdb";
import { discussionHref } from "@/lib/urls";

function discussionCanonical(discussion: { id: string; title: string }) {
  return absoluteUrl(discussionHref(discussion));
}

export async function generateDiscussionMetadata(
  discussionId: string
): Promise<Metadata> {
  const discussion = await getPublicCommunityDiscussion(discussionId);

  if (!discussion) {
    return {
      title: "Discussion",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${discussion.title} Discussion`;
  const description = truncateDescription(
    `${discussion.body} Join the PopScore discussion about ${discussion.movieTitle}.`
  );
  const canonical = discussionCanonical(discussion);
  const image = posterUrl(discussion.moviePosterUrl);

  return {
    title,
    description,
    keywords: [
      `${discussion.movieTitle} discussion`,
      `${discussion.movieTitle} reviews`,
      "movie discussions",
      "movie reviews and ratings",
      ...SITE_KEYWORDS,
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: image
        ? [
            {
              url: image,
              alt: `${discussion.movieTitle} discussion movie poster`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function discussionJsonLd(
  discussion: NonNullable<Awaited<ReturnType<typeof getPublicCommunityDiscussion>>>
) {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    about: {
      "@type": "Movie",
      name: discussion.movieTitle,
    },
    articleBody: discussion.body,
    author: {
      "@type": "Person",
      name: discussion.startedByUsername ?? discussion.startedByDisplayName,
    },
    dateCreated: discussion.createdAt,
    dateModified: discussion.lastActiveAt,
    headline: discussion.title,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: discussion.commentCount,
    },
    url: discussionCanonical(discussion),
  };
}

export default async function DiscussionDetailPageContent({
  discussionId,
}: {
  discussionId: string;
}) {
  const discussion = await getPublicCommunityDiscussion(discussionId);
  const schema = discussion ? discussionJsonLd(discussion) : null;

  return (
    <>
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
      <DiscussionDetailClient
        discussionId={discussionId}
        initialDiscussion={discussion}
        initialLoadComplete
      />
    </>
  );
}
