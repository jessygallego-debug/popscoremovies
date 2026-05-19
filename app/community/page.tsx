import Link from "next/link";
import CommunityPostComments from "@/app/components/community-post-comments";
import CommunityPostLikeButton from "@/app/components/community-post-like-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import SiteHeader from "@/app/components/site-header";
import { posterUrl } from "@/lib/tmdb";

type CommunityUser = {
  avatar: string;
  displayName: string;
  username: string;
};

type CommunityFeedPost = {
  activity: string;
  comment?: string;
  commentCount: number;
  id: string;
  interactedAvatars: string[];
  extraInteractions: number;
  likeCount: number;
  movie: {
    fallbackMovieId: string;
    imagePath: string | null;
    title: string;
  };
  popscore?: number;
  reaction?: string;
  replyLink?: string;
  timestamp: string;
  user: CommunityUser;
};

type Discussion = {
  commentCount: number;
  fallbackMovieId: string;
  imagePath: string | null;
  title: string;
};

type SuggestedFollow = CommunityUser & {
  favoriteGenre: string;
};

type TopReviewer = CommunityUser & {
  totalReviews: number;
};

const feedTabs = ["Feed", "Following", "Trending", "Discussions", "People"];

const genreFilters = [
  "All Genres",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Rom-Com",
  "Sci-Fi",
  "Thriller",
  "War",
];

const trendFilters = ["Trending", "Newest", "Most Liked", "Most Commented"];

const feedPosts: CommunityFeedPost[] = [
  {
    id: "interstellar-rating",
    user: {
      avatar: "🔥",
      displayName: "Jessy",
      username: "jessy",
    },
    activity: "rated Interstellar",
    timestamp: "2h ago",
    movie: {
      title: "Interstellar",
      fallbackMovieId: "157336",
      imagePath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    popscore: 94,
    reaction: "🔥 Loved It",
    comment:
      "A masterpiece. The visuals, the story, the emotions... everything about this movie hits differently.",
    likeCount: 24,
    commentCount: 7,
    interactedAvatars: ["🎬", "🌹", "⭐", "🚀"],
    extraInteractions: 18,
  },
  {
    id: "sinners-worth-watching",
    user: {
      avatar: "🎬",
      displayName: "Mike",
      username: "moviemike",
    },
    activity: "marked Sinners as Worth Watching",
    timestamp: "5h ago",
    movie: {
      title: "Sinners",
      fallbackMovieId: "1233413",
      imagePath: null,
    },
    popscore: 78,
    reaction: "🍿 Worth Watching",
    comment:
      "Great music, strong performances and a fresh take on the genre. Third act was wild!",
    likeCount: 16,
    commentCount: 3,
    interactedAvatars: ["🔥", "🎥", "👻", "🎟️"],
    extraInteractions: 12,
  },
  {
    id: "dark-knight-comment",
    user: {
      avatar: "🌹",
      displayName: "Sarah",
      username: "sarahscreens",
    },
    activity: "commented on The Dark Knight",
    timestamp: "1d ago",
    movie: {
      title: "The Dark Knight",
      fallbackMovieId: "155",
      imagePath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    },
    comment:
      "Heath Ledger delivered something the world has never seen before. Still gives me chills.",
    likeCount: 21,
    commentCount: 4,
    replyLink: "View 4 replies",
    interactedAvatars: [],
    extraInteractions: 0,
  },
  {
    id: "prestige-discovery",
    user: {
      avatar: "🚀",
      displayName: "Chris",
      username: "cinephilechris",
    },
    activity: "discovered The Prestige",
    timestamp: "1d ago",
    movie: {
      title: "The Prestige",
      fallbackMovieId: "1124",
      imagePath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
    },
    comment: "Discovered this gem through PopScore Discovery ✨",
    likeCount: 18,
    commentCount: 2,
    interactedAvatars: ["🔥", "🎬", "🎥", "👻"],
    extraInteractions: 7,
  },
  {
    id: "dune-rating",
    user: {
      avatar: "👻",
      displayName: "Lina",
      username: "linarose",
    },
    activity: "rated Dune: Part Two",
    timestamp: "2d ago",
    movie: {
      title: "Dune: Part Two",
      fallbackMovieId: "693134",
      imagePath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    },
    popscore: 90,
    reaction: "🔥 Loved It",
    comment: "Absolutely stunning. Villeneuve is in a league of his own.",
    likeCount: 31,
    commentCount: 5,
    interactedAvatars: ["🚀", "🎬", "🔥", "🎥"],
    extraInteractions: 22,
  },
];

const discussions: Discussion[] = [
  {
    title: "Was Interstellar Nolan's best movie?",
    commentCount: 68,
    fallbackMovieId: "157336",
    imagePath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    title: "The ending of Sinners explained (spoilers)",
    commentCount: 42,
    fallbackMovieId: "1233413",
    imagePath: null,
  },
  {
    title: "Best plot twists of all time?",
    commentCount: 91,
    fallbackMovieId: "1124",
    imagePath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
  },
];

const suggestedFollows: SuggestedFollow[] = [
  {
    avatar: "👻",
    displayName: "Lina Rose",
    username: "linarose",
    favoriteGenre: "Horror",
  },
  {
    avatar: "🎬",
    displayName: "MovieMike",
    username: "moviemike",
    favoriteGenre: "Action",
  },
  {
    avatar: "🎥",
    displayName: "FilmFanatic",
    username: "filmfanatic",
    favoriteGenre: "Drama",
  },
  {
    avatar: "🚀",
    displayName: "CinephileChris",
    username: "cinephilechris",
    favoriteGenre: "Sci-Fi",
  },
];

const topReviewers: TopReviewer[] = [
  {
    avatar: "⭐",
    displayName: "CinemaKing",
    username: "cinemaking",
    totalReviews: 136,
  },
  {
    avatar: "🔥",
    displayName: "Jessi Lee",
    username: "jessilee",
    totalReviews: 124,
  },
  {
    avatar: "🎬",
    displayName: "MovieMike",
    username: "moviemike",
    totalReviews: 112,
  },
  {
    avatar: "🎥",
    displayName: "FilmFanatic",
    username: "filmfanatic",
    totalReviews: 98,
  },
  {
    avatar: "👻",
    displayName: "Lina Rose",
    username: "linarose",
    totalReviews: 87,
  },
];

function cardClass(extra = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/78 shadow-2xl shadow-black/30 backdrop-blur ${extra}`;
}

function scoreBadgeClass(score: number) {
  if (score >= 90) {
    return "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 shadow-emerald-400/10";
  }

  if (score >= 75) {
    return "border-yellow-400/40 bg-yellow-400/20 text-yellow-200 shadow-yellow-400/10";
  }

  return "border-orange-400/40 bg-orange-500/20 text-orange-200 shadow-orange-400/10";
}

function Avatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    lg: "h-12 w-12 text-2xl",
    md: "h-10 w-10 text-xl",
    sm: "h-7 w-7 text-sm",
  }[size];

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),rgba(15,23,42,0.96)_58%)] font-black text-white shadow-lg shadow-yellow-400/10`}
    >
      {label}
    </span>
  );
}

function MovieThumb({
  alt,
  fallbackMovieId,
  imagePath,
  wide = false,
}: {
  alt: string;
  fallbackMovieId: string;
  imagePath: string | null;
  wide?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900 ${
        wide
          ? "mx-auto aspect-[2/3] w-full max-w-[220px] sm:mx-0 sm:max-w-none"
          : "aspect-[4/3]"
      }`}
    >
      <MoviePosterImage
        alt={alt}
        className="object-cover"
        fallbackMovieId={fallbackMovieId}
        sizes={wide ? "(min-width: 1024px) 190px, 220px" : "96px"}
        src={posterUrl(imagePath)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}

function CommunityTabs() {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-white/10 text-sm font-black text-slate-400 sm:gap-8">
      {feedTabs.map((tab, index) => (
        <button
          key={tab}
          type="button"
          className={`shrink-0 border-b-2 px-0 pb-3 transition hover:text-yellow-300 ${
            index === 0
              ? "border-yellow-400 text-yellow-300"
              : "border-transparent"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function CommunitySearch() {
  return (
    <label className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-800 bg-black/35 px-4 text-sm font-bold text-slate-400 shadow-inner shadow-black/20 sm:max-w-md">
      <span aria-hidden="true" className="text-lg">
        ⌕
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
        placeholder="Search movies, users..."
        type="search"
      />
    </label>
  );
}

function CreatePostBox() {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="flex items-center gap-3">
        <Avatar label="🔥" size="lg" />
        <p className="text-base font-semibold text-slate-300">
          What movie is on your mind?
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        {["Photo", "Rating", "Review"].map((action) => (
          <button
            key={action}
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            <span aria-hidden="true">
              {action === "Photo" ? "▧" : action === "Rating" ? "☆" : "✎"}
            </span>
            {action}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
        >
          Post
        </button>
      </div>
    </section>
  );
}

function FilterMenu({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/90 px-4 text-sm font-black text-slate-100 shadow-inner shadow-black/20 outline-none transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-200 [&::-webkit-details-marker]:hidden">
        {label}
        <span
          aria-hidden="true"
          className="text-yellow-300 transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="absolute left-0 z-30 mt-2 grid max-h-72 min-w-52 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/60">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={`rounded-xl px-3 py-2 text-left text-sm font-black transition ${
              index === 0
                ? "bg-yellow-400 text-black"
                : "text-slate-200 hover:bg-yellow-400/10 hover:text-yellow-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </details>
  );
}

function CommunityFilters() {
  return (
    <section className={cardClass("p-3")}>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-yellow-400 bg-yellow-400/10 px-4 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
        >
          All
        </button>
        <FilterMenu label="All Genres" options={genreFilters} />
        <FilterMenu label="Trending" options={trendFilters} />
      </div>
    </section>
  );
}

function InteractionAvatars({
  avatars,
  extra,
}: {
  avatars: string[];
  extra: number;
}) {
  if (avatars.length === 0 && extra === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {avatars.map((avatar, index) => (
        <span
          key={`${avatar}-${index}`}
          className="-ml-2 first:ml-0"
          style={{ zIndex: avatars.length - index }}
        >
          <Avatar label={avatar} size="sm" />
        </span>
      ))}
      {extra > 0 ? (
        <span className="ml-2 text-xs font-bold text-slate-400">+{extra}</span>
      ) : null}
    </div>
  );
}

function CommunityFeedCard({ post }: { post: CommunityFeedPost }) {
  const isCommentPost = Boolean(post.replyLink);

  return (
    <article className={cardClass("p-4 sm:p-5")}>
      <div className="flex items-start gap-3">
        <Avatar label={post.user.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-200">
                <span className="font-black text-white">
                  @{post.user.username}
                </span>{" "}
                {post.activity}
                {post.popscore ? (
                  <span
                    className={`ml-2 inline-flex rounded-lg border px-2 py-1 text-sm font-black shadow-lg ${scoreBadgeClass(
                      post.popscore
                    )}`}
                  >
                    {post.popscore}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {post.timestamp}
              </p>
            </div>
            <button
              type="button"
              aria-label="More options"
              className="rounded-full px-2 text-xl font-black text-slate-500 transition hover:bg-white/10 hover:text-yellow-300"
            >
              ...
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] lg:grid-cols-[190px_1fr]">
            <MovieThumb
              alt={post.movie.title}
              fallbackMovieId={post.movie.fallbackMovieId}
              imagePath={post.movie.imagePath}
              wide
            />
            <div className="flex min-w-0 flex-col justify-center">
              {post.reaction ? (
                <p
                  className={`text-base font-black ${
                    post.reaction.includes("Loved")
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {post.reaction}
                </p>
              ) : null}
              {post.comment ? (
                <p
                  className={`mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-300 ${
                    isCommentPost
                      ? "rounded-2xl border border-slate-800 bg-black/25 p-4"
                      : ""
                  }`}
                >
                  {post.comment}
                </p>
              ) : null}
              <CommunityPostLikeButton
                className="mt-3"
                initialLikeCount={post.likeCount}
                postId={post.id}
              />
              {isCommentPost ? (
                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm font-bold">
                  <button
                    type="button"
                    className="text-slate-300 transition hover:text-yellow-300"
                  >
                    Reply
                  </button>
                  <Link href="/community" className="text-yellow-300">
                    {post.replyLink}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {!isCommentPost ? (
            <div className="mt-4 flex justify-end">
              <InteractionAvatars
                avatars={post.interactedAvatars}
                extra={post.extraInteractions}
              />
            </div>
          ) : null}

          <CommunityPostComments
            initialCommentCount={post.commentCount}
            postId={post.id}
          />
        </div>
      </div>
    </article>
  );
}

function SidebarCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <Link
          href="/community"
          className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          See All
        </Link>
      </div>
      {children}
    </section>
  );
}

function TrendingDiscussionsCard() {
  return (
    <SidebarCard title="Trending Discussions">
      <div className="space-y-4">
        {discussions.map((discussion) => (
          <div
            key={discussion.title}
            className="grid grid-cols-[82px_1fr] items-center gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
          >
            <MovieThumb
              alt={discussion.title}
              fallbackMovieId={discussion.fallbackMovieId}
              imagePath={discussion.imagePath}
            />
            <div className="min-w-0">
              <p className="text-sm font-black leading-5 text-white">
                {discussion.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {discussion.commentCount} comments
              </p>
            </div>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function WhoToFollowCard() {
  return (
    <SidebarCard title="Who to Follow">
      <div className="space-y-4">
        {suggestedFollows.map((user) => (
          <div key={user.username} className="flex items-center gap-3">
            <Avatar label={user.avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-black text-white">{user.displayName}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                Favorite: {user.favoriteGenre}
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-yellow-400/70 px-4 py-2 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function ReviewCountBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} reviews`}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/40 bg-yellow-400/20 text-sm font-black text-yellow-200 shadow-lg shadow-yellow-400/10"
      style={{
        clipPath:
          "polygon(50% 0%, 92% 25%, 92% 75%, 50% 100%, 8% 75%, 8% 25%)",
      }}
    >
      {count}
    </span>
  );
}

function TopReviewersCard() {
  return (
    <SidebarCard title="Top Reviewers">
      <div className="space-y-4">
        {topReviewers.map((reviewer, index) => (
          <div
            key={reviewer.username}
            className="grid grid-cols-[24px_40px_1fr_auto] items-center gap-3"
          >
            <span className="text-sm font-black text-white">{index + 1}</span>
            <Avatar label={reviewer.avatar} />
            <div className="min-w-0">
              <p className="truncate font-black text-white">
                {reviewer.displayName}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                {reviewer.totalReviews} reviews
              </p>
            </div>
            <ReviewCountBadge count={reviewer.totalReviews} />
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

export default function CommunityPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-7 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Community
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                See what PopScore fans are rating, reviewing, and discovering
                right now.
              </p>
            </div>
            <CommunitySearch />
          </div>
          <div className="mt-6">
            <CommunityTabs />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-4 sm:space-y-5">
            <CreatePostBox />
            <CommunityFilters />
            {feedPosts.map((post) => (
              <CommunityFeedCard key={post.id} post={post} />
            ))}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <TrendingDiscussionsCard />
            <WhoToFollowCard />
            <TopReviewersCard />
          </aside>
        </section>
      </section>
    </main>
  );
}
