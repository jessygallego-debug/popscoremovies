import type { Metadata } from "next";
import DiscussionDetailClient from "@/app/community/discussions/[discussionId]/discussion-detail-client";
import {
  getMockCommunityDiscussion,
  getMockDiscussionReplies,
} from "@/lib/community-discussions";
import { absoluteUrl, truncateDescription } from "@/lib/site-url";
import { posterUrl } from "@/lib/tmdb";
import { discussionHref } from "@/lib/urls";

function discussionCanonical(discussionId: string) {
  const discussion = getMockCommunityDiscussion(discussionId);

  return absoluteUrl(
    discussion
      ? discussionHref(discussion)
      : `/community/discussions/${discussionId}`
  );
}

export async function generateDiscussionMetadata(
  discussionId: string
): Promise<Metadata> {
  const discussion = getMockCommunityDiscussion(discussionId);

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
  const canonical = discussionCanonical(discussionId);
  const image = posterUrl(discussion.moviePosterUrl);

  return {
    title,
    description,
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
              alt: discussion.movieTitle,
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

function discussionJsonLd(discussionId: string) {
  const discussion = getMockCommunityDiscussion(discussionId);

  if (!discussion) {
    return null;
  }

  const replies = getMockDiscussionReplies(discussionId);

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
    comment: replies.map((reply) => ({
      "@type": "Comment",
      author: {
        "@type": "Person",
        name: reply.username ?? reply.userDisplayName,
      },
      datePublished: reply.createdAt,
      text: reply.body,
    })),
    dateCreated: discussion.createdAt,
    dateModified: discussion.lastActiveAt,
    headline: discussion.title,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: discussion.commentCount,
    },
    url: discussionCanonical(discussionId),
  };
}

export default function DiscussionDetailPageContent({
  discussionId,
}: {
  discussionId: string;
}) {
  const schema = discussionJsonLd(discussionId);

  return (
    <>
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
      <DiscussionDetailClient discussionId={discussionId} />
    </>
  );
}
