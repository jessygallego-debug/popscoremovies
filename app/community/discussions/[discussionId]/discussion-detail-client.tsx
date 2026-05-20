"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import SiteHeader from "@/app/components/site-header";
import {
  communityDiscussionsStorageKey,
  getMockCommunityDiscussion,
  getMockDiscussionReplies,
  parseStoredCommunityDiscussions,
  type CommunityDiscussion,
  type CommunityDiscussionReply,
} from "@/lib/community-discussions";
import { posterUrl } from "@/lib/tmdb";

type ReplySort = "Top" | "Newest";

function cardClass(extra = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/78 shadow-2xl shadow-black/30 backdrop-blur ${extra}`;
}

function Avatar({ label }: { label: string }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),rgba(15,23,42,0.96)_58%)] text-xl font-black text-white shadow-lg shadow-yellow-400/10">
      {label}
    </span>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "spoiler" | "type";
}) {
  const toneClass =
    tone === "spoiler"
      ? "border-red-400/40 bg-red-500/15 text-red-200"
      : tone === "type"
        ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
        : "border-slate-700 bg-slate-900/80 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}
    >
      {children}
    </span>
  );
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "Just now";
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  return `${Math.floor(hoursAgo / 24)}d ago`;
}

function formatFullDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function findStoredDiscussion(discussionId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    parseStoredCommunityDiscussions(
      window.localStorage.getItem(communityDiscussionsStorageKey)
    ).find((discussion) => discussion.id === discussionId) ?? null
  );
}

function ReplyCard({ reply }: { reply: CommunityDiscussionReply }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-black/25 p-4">
      <div className="flex gap-3">
        <Avatar label={reply.userAvatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-black text-white">{reply.userDisplayName}</p>
            {reply.username ? (
              <p className="text-xs font-bold text-slate-500">
                @{reply.username}
              </p>
            ) : null}
            <p className="text-xs font-bold text-slate-500">
              {formatRelativeTime(reply.createdAt)}
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            {reply.body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-bold">
            <button
              type="button"
              className="text-red-300 transition hover:text-red-200"
            >
              ♥ {reply.likeCount}
            </button>
            <button
              type="button"
              className="text-slate-300 transition hover:text-yellow-300"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DiscussionDetailClient({
  discussionId,
}: {
  discussionId: string;
}) {
  const [storedDiscussion, setStoredDiscussion] =
    useState<CommunityDiscussion | null>(null);
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [replySort, setReplySort] = useState<ReplySort>("Top");
  const [replyBody, setReplyBody] = useState("");
  const [addedReplies, setAddedReplies] = useState<CommunityDiscussionReply[]>(
    []
  );
  const mockDiscussion = getMockCommunityDiscussion(discussionId);
  const discussion = storedDiscussion ?? mockDiscussion;
  const mockReplies = useMemo(
    () => getMockDiscussionReplies(discussionId),
    [discussionId]
  );
  const replies = useMemo(() => {
    const sortedReplies = [...addedReplies, ...mockReplies];

    if (replySort === "Newest") {
      return sortedReplies.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return sortedReplies.sort((a, b) => b.likeCount - a.likeCount);
  }, [addedReplies, mockReplies, replySort]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStoredDiscussion(findStoredDiscussion(discussionId));
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [discussionId]);

  if (!discussion) {
    return (
      <main className="min-h-screen bg-black bg-[linear-gradient(180deg,#020617_0%,#000_55%,#020617_100%)] px-5 py-6 text-white sm:px-8">
        <section className="mx-auto max-w-4xl">
          <SiteHeader />
          <div className={cardClass("mt-8 p-6")}>
            <Link
              href="/community"
              className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
            >
              Back to Community
            </Link>
            <h1 className="mt-4 text-2xl font-black text-white">
              Discussion not found
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              This discussion may have been removed or has not been posted yet.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const spoilerLocked = discussion.isSpoiler && !isSpoilerVisible;
  const likeCount = discussion.likeCount + (isLiked ? 1 : 0);
  const replyCount = discussion.commentCount + addedReplies.length;
  const submitReply = () => {
    const trimmedReply = replyBody.trim();

    if (!trimmedReply) {
      return;
    }

    setAddedReplies((currentReplies) => [
      {
        body: trimmedReply,
        createdAt: new Date().toISOString(),
        id: `reply-${Date.now()}`,
        likeCount: 0,
        userAvatarUrl: "🔥",
        userDisplayName: "Jessy",
        username: "jessyg305",
      },
      ...currentReplies,
    ]);
    setReplyBody("");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] px-5 py-6 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1200px]">
        <SiteHeader />

        <Link
          href="/community"
          className="mt-7 inline-flex text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          Back to Community
        </Link>

        <section className={cardClass("mt-5 overflow-hidden")}>
          <div className="grid gap-5 p-4 sm:grid-cols-[150px_1fr] sm:p-5">
            <div className="relative mx-auto aspect-[2/3] w-full max-w-[150px] overflow-hidden rounded-2xl bg-slate-900 sm:mx-0">
              <MoviePosterImage
                alt={discussion.movieTitle}
                className="object-cover"
                fallbackMovieId={discussion.movieId}
                sizes="150px"
                src={posterUrl(discussion.moviePosterUrl)}
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black text-yellow-300">
                {discussion.movieTitle}
                {discussion.movieYear ? ` • ${discussion.movieYear}` : ""}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">
                {discussion.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="type">{discussion.type}</Badge>
                {discussion.isSpoiler ? (
                  <Badge tone="spoiler">Spoilers</Badge>
                ) : (
                  <Badge>Spoiler-Free</Badge>
                )}
                {discussion.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Avatar label={discussion.startedByAvatarUrl} />
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Started by{" "}
                    <span className="font-black text-white">
                      {discussion.startedByDisplayName}
                    </span>
                    {discussion.startedByUsername ? (
                      <span> @{discussion.startedByUsername}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Created {formatFullDate(discussion.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {discussion.isSpoiler ? (
          <section className={cardClass("mt-5 border-red-400/30 bg-red-950/20 p-4 sm:p-5")}>
            <h2 className="text-lg font-black text-red-100">
              Spoiler Warning
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-red-100/80">
              This discussion contains spoilers for {discussion.movieTitle}.
            </p>
            {spoilerLocked ? (
              <button
                type="button"
                onClick={() => setIsSpoilerVisible(true)}
                className="mt-4 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
              >
                Show Spoilers
              </button>
            ) : null}
          </section>
        ) : null}

        {!spoilerLocked ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-5">
              <article className={cardClass("p-4 sm:p-5")}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-white">
                    Original Post
                  </h2>
                  <button
                    type="button"
                    aria-pressed={isLiked}
                    onClick={() => setIsLiked((current) => !current)}
                    className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                      isLiked
                        ? "border-red-400/60 bg-red-500/20 text-red-200"
                        : "border-slate-700 text-slate-300 hover:border-red-400/60 hover:text-red-200"
                    }`}
                  >
                    ♥ {likeCount}
                  </button>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
                  {discussion.body ||
                    "No opening comment yet. Jump in and get the conversation started."}
                </p>
              </article>

              <section className={cardClass("p-4 sm:p-5")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-white">
                      Replies
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      {replyCount} replies
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(["Top", "Newest"] as const).map((sort) => (
                      <button
                        key={sort}
                        type="button"
                        aria-pressed={replySort === sort}
                        onClick={() => setReplySort(sort)}
                        className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                          replySort === sort
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : "border-slate-700 text-slate-300 hover:border-yellow-400/60 hover:text-yellow-300"
                        }`}
                      >
                        {sort}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder="Add your reply..."
                    className="min-h-28 w-full resize-none rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
                  />
                  <button
                    type="button"
                    disabled={!replyBody.trim()}
                    onClick={submitReply}
                    className="justify-self-end rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                  >
                    Post Reply
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {replies.length > 0 ? (
                    replies.map((reply) => (
                      <ReplyCard key={reply.id} reply={reply} />
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-800 bg-black/25 p-4 text-sm font-bold text-slate-400">
                      No replies yet.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className={cardClass("p-4")}>
                <h2 className="text-lg font-black text-white">Movie</h2>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  {discussion.movieTitle}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {discussion.movieGenres.join(" • ")}
                </p>
              </section>
              <section className={cardClass("p-4")}>
                <h2 className="text-lg font-black text-white">Activity</h2>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  {discussion.commentCount} replies
                </p>
                <p className="mt-1 text-sm font-bold text-slate-300">
                  {likeCount} likes
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Active {formatRelativeTime(discussion.lastActiveAt)}
                </p>
              </section>
            </aside>
          </section>
        ) : null}
      </section>
    </main>
  );
}
