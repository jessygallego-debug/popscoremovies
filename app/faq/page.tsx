import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/app/components/site-header";
import {
  SITE_ICON_ALT,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";

const faqTitle = "PopScore FAQ | How PopScore Movie Ratings Work";
const faqDescription =
  "Learn how PopScore movie ratings, genre-specific questions, PopFiles, watchlists, recommendations, and community discussions help fans find movies worth watching.";
const faqImage = {
  url: absoluteUrl(SITE_ICON_PATH),
  width: 256,
  height: 256,
  alt: SITE_ICON_ALT,
};

const howPopScoreWorks = [
  {
    title: "Search for a movie",
    description:
      "Find the movie you watched or want to rate, even if you are still learning the exact title.",
  },
  {
    title: "Answer genre-specific questions",
    description:
      "PopScore asks questions that fit the movie type, so horror, comedy, action, romance, and other genres are judged by what matters most.",
  },
  {
    title: "Get a clearer PopScore",
    description:
      "Your answers are weighted into a final score that shows how strongly the movie worked for its genre.",
  },
  {
    title: "Build your PopFile",
    description:
      "Your PopFile tracks your ratings, reviews, favorite genres, reactions, and watchlist activity in one place.",
  },
  {
    title: "Discover what to watch next",
    description:
      "The more movies you rate, the better PopScore can help you find recommendations that match your taste.",
  },
];

const faqSections = [
  {
    title: "Getting Started",
    items: [
      {
        question: "What is PopScore?",
        answer:
          "PopScore is a movie rating and recommendation site built for real fans. It helps you rate movies by genre, track your taste, and discover movies worth watching.",
      },
      {
        question: "What makes PopScore different from other movie rating sites?",
        answer:
          "PopScore does not treat every movie the same way. A horror movie, comedy, western, romance, and action movie each need different strengths, so PopScore uses genre-specific questions instead of one generic rating.",
      },
      {
        question: "Do I need an account to use PopScore?",
        answer:
          "You can browse movies and explore PopScore recommendations without an account. Creating a PopFile lets you save ratings, reviews, watchlist picks, and community activity.",
      },
      {
        question: "What is a PopFile?",
        answer:
          "Your PopFile is your movie profile. It keeps your ratings, reviews, favorite genres, reactions, watchlist, and movie taste organized.",
      },
    ],
  },
  {
    title: "Ratings",
    items: [
      {
        question: "How are PopScores calculated?",
        answer:
          "PopScores come from five rating questions. Storyline, character, and rewatch score are used across genres, then each genre adds two questions that fit that kind of movie. Those answers are weighted into the final PopScore.",
      },
      {
        question: "Why does PopScore use genre-specific ratings?",
        answer:
          "Different movie types succeed for different reasons. PopScore rates movies by the standards fans actually use, so a scary horror movie is not judged by the same exact criteria as a funny comedy or a sweeping fantasy movie.",
      },
      {
        question: "Can I rate superhero movies?",
        answer:
          "Yes. Superhero works as a quick filter for finding those movies. When you rate one, PopScore still uses the movie's main genre, like Action, Sci-Fi, Comedy, or Fantasy, for the scoring questions.",
      },
      {
        question: "Why do some movies say not rated yet?",
        answer:
          "That means the movie does not have enough PopScore ratings yet. You can be one of the first fans to rate it and help shape its score.",
      },
    ],
  },
  {
    title: "Movie Match",
    items: [
      {
        question: "How does PopScore recommend movies?",
        answer:
          "PopScore uses your ratings, favorite genres, and watchlist activity to help surface movies that fit your taste. The more you rate, the more useful your recommendations become.",
      },
      {
        question: "Can I browse movies by genre?",
        answer:
          "Yes. You can explore movies by Action, Adventure, Animation, Comedy, Documentary, Drama, Family, Fantasy, Horror, Mystery, Musical, Romance, Rom-Com, Sci-Fi, Superhero, Thriller, War, Western, and more.",
      },
      {
        question: "What is the Watchlist for?",
        answer:
          "Your Watchlist is where you save movies you want to see later, so good recommendations do not disappear when you are not ready to watch yet.",
      },
      {
        question: "Can PopScore help if I do not know what to watch?",
        answer:
          "Yes. Use Movie Match to pick a genre, era, language, or region, then PopScore will show movie ideas that match the mood you are looking for.",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        question: "What can I do in the PopScore community?",
        answer:
          "You can post reviews, start movie discussions, react to ratings, follow other fans, reply to comments, and see what the community is watching.",
      },
      {
        question: "What are movie discussions for?",
        answer:
          "Discussions give fans a place to ask questions, debate endings, share theories, recommend movies, and keep conversations connected to specific titles.",
      },
      {
        question: "How do reactions work?",
        answer:
          "Reactions let fans quickly say whether a movie was loved, worth watching, or not worth the time. They help show the community mood alongside the PopScore.",
      },
      {
        question: "Who is PopScore for?",
        answer:
          "PopScore is for movie fans who want ratings that understand genre, recommendations that fit their taste, and a place to keep their movie opinions organized.",
      },
    ],
  },
];

const faqItems = faqSections.flatMap((section) => section.items);
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export const metadata: Metadata = {
  title: { absolute: faqTitle },
  description: faqDescription,
  keywords: [
    "how PopScore works",
    "PopScore FAQ",
    "movie rating FAQ",
    "genre-specific movie ratings",
    "movie recommendation questions",
    ...SITE_KEYWORDS,
  ],
  alternates: {
    canonical: absoluteUrl("/faq"),
  },
  openGraph: {
    title: faqTitle,
    description: faqDescription,
    images: [faqImage],
    siteName: SITE_NAME,
    type: "website",
    url: absoluteUrl("/faq"),
  },
  twitter: {
    card: "summary",
    title: faqTitle,
    description: faqDescription,
    images: [faqImage],
  },
};

export default function FaqPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_40%,#000_72%,#020617_100%)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(rgba(250,204,21,0.28)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]">
              PopScore FAQ
            </div>
            <h1 className="text-4xl font-black leading-[0.98] text-white sm:text-6xl xl:text-7xl">
              Questions About PopScore?
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Learn how PopScore ratings, genre-specific questions, PopFiles,
              movie recommendations, watchlists, and community features help you
              find movies worth watching.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/rate"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
              >
                Rate a Movie
              </Link>
              <Link
                href="/discover"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700/90 bg-slate-950/80 px-5 py-2.5 text-sm font-black text-slate-200 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-200"
              >
                Explore Movie Match
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="how-popscore-works-heading"
          className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/65 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-6"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 sm:text-xs">
            Start Here
          </p>
          <h2
            id="how-popscore-works-heading"
            className="mt-2 text-2xl font-black text-white sm:text-4xl"
          >
            How PopScore Works
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-5">
            {howPopScoreWorks.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-yellow-400/[0.06] sm:p-4"
              >
                <p className="text-2xl font-black text-yellow-300 sm:text-3xl">
                  {index + 1}
                </p>
                <h3 className="mt-2 text-sm font-black leading-snug text-white sm:mt-3 sm:text-base">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-300 sm:text-sm sm:leading-6">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="faq-heading"
          className="mt-8 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/65 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-6"
        >
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 sm:text-xs">
              Movie Ratings, Recommendations, and Community
            </p>
            <h2
              id="faq-heading"
              className="mt-2 text-2xl font-black text-white sm:text-4xl"
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="-mx-5 mt-6 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-7 lg:grid lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
            {faqSections.map((section) => (
              <section
                key={section.title}
                aria-labelledby={`faq-${section.title
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className="min-w-[82%] snap-start rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:min-w-[58%] lg:min-w-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
              >
                <h3
                  id={`faq-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-lg font-black text-yellow-300 sm:text-xl"
                >
                  {section.title}
                </h3>
                <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
                  {section.items.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-2xl border border-white/10 bg-slate-950/65 p-3 lg:bg-white/[0.03] lg:p-4"
                    >
                      <summary className="cursor-pointer list-none text-sm font-black leading-snug text-white marker:hidden sm:text-base">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.question}</span>
                          <span className="mt-0.5 text-yellow-300 transition group-open:rotate-45">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-xs font-semibold leading-5 text-slate-300 sm:text-sm sm:leading-6">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/10 p-5 text-center shadow-2xl shadow-black/30 sm:rounded-[1.75rem] sm:p-7">
          <h2 className="text-2xl font-black text-white sm:text-3xl">
            Ready to create your PopFile?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">
            Start rating movies, save what you want to watch, and let PopScore
            learn the kind of movies you actually love.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/profile/edit?returnTo=%2Ffaq"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
            >
              Create Your PopFile
            </Link>
            <Link
              href="/#trending"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700/90 bg-slate-950/80 px-5 py-2.5 text-sm font-black text-slate-200 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-200"
            >
              Browse Movies
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
