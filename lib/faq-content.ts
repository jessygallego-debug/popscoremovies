export const howPopScoreWorks = [
  { title: "Search for a movie", description: "Find a movie by title, browse a genre, or explore Movie Match." },
  { title: "Answer five questions", description: "Rate each question from 1 to 5 using the criteria chosen for that movie's genre." },
  { title: "Get your PopScore", description: "Your weighted answers produce a personal score from 0 to 100 and contribute to the movie's community PopScore." },
  { title: "Build your PopFile", description: "Keep your ratings, reviews, Top 5 movies, Movie DNA, and viewing activity together." },
  { title: "Find your next movie", description: "Explore Movie Match and save movies to your Watchlist for later." },
];

export const faqSections = [
  {
    title: "Getting Started",
    items: [
      { question: "What is PopScore?", answer: "PopScore is a movie rating and discovery site built around genre-specific questions. Rate movies, build your PopFile, find your next watch, and talk about movies with other fans." },
      { question: "Do I need an account?", answer: "You can browse movies, public PopFiles, and Movie Match without an account. Sign in and create your PopFile to save ratings, manage your Watchlist, follow fans, and participate in the community." },
      { question: "What is a PopFile?", answer: "Your PopFile is your public movie profile. It brings together your ratings, reviews, Top 5 picks, Movie DNA, viewing activity, achievements, and connections with other fans." },
      { question: "How do I personalize my PopFile?", answer: "Open Edit PopFile to choose an avatar or upload a profile photo, set your favorite genre, and manage email preferences. Your username is linked to your account and cannot be changed after your PopFile is created." },
      { question: "What if I forget my username?", answer: "On the sign-in page, enter your account email and choose Forgot username. If an account exists, a secure sign-in link will be sent to that address; opening it shows your username on the profile editor." },
    ],
  },
  {
    title: "PopScore Ratings",
    items: [
      { question: "How is my PopScore calculated?", answer: "Answer all five questions from 1 to 5. Each answer converts to a percentage: 1 = 0%, 2 = 40%, 3 = 60%, 4 = 80%, and 5 = 100%. PopScore applies the genre's question weights and rounds the result to a score from 0 to 100. The question information buttons explain what to consider." },
      { question: "Which questions do I answer?", answer: "Every genre includes Storyline and Rewatch Score. Most use Acting; Animation uses Voice Acting, while Fantasy and Western use Character. The remaining two questions reflect the genre, such as Scare Factor and Originality for Horror or Humor and Quotability for Comedy. The weights also depend on the genre." },
      { question: "How is a movie's public PopScore different from mine?", answer: "Your score reflects your own five answers. The movie's public PopScore averages the submitted weighted ratings, so it can differ from yours. Community likes, comments, and Watchlist saves do not change that score." },
      { question: "What do the popcorn rating labels mean?", answer: "The labels describe the numeric PopScore: Extra Buttery is 90–100, Buttery is 75–89, Popcorn (also called Fresh Popcorn) is 60–74, Salty is 40–59, and Burnt is 0–39. They are labels for the same score, not separate votes." },
      { question: "Why does a movie show NR or Not rated yet?", answer: "No usable PopScore ratings are available for that movie yet. NR is not a zero score. Submit a full five-question rating to contribute." },
      { question: "How is the rating genre chosen?", answer: "PopScore uses the movie's details to choose suitable rating criteria. When the movie needs a genre choice, the rating page offers the supported options. Community genre choices can establish a shared choice when one genre has at least three votes and at least 67% of the votes." },
      { question: "Can I update my rating or add a review?", answer: "Yes. Rating the same movie again updates your existing rating rather than adding a second rating from your account. You can include an optional review of up to 300 characters. Keep it clean; reviews are checked before they are saved." },
      { question: "Can I share my rating?", answer: "Use Share after rating a movie or from your rating history to create a graphic with the movie and your personal PopScore. Sharing does not submit another rating." },
    ],
  },
  {
    title: "Watchlist and Movie Match",
    items: [
      { question: "How do I use my Watchlist?", answer: "Tap the plus in the top-right corner of a movie poster to save it. A yellow bookmark means it is saved; tap it again to remove it. A brief message confirms each change. You can also manage saved movies from movie pages. Your Watchlist supports genre filtering and shows Rate Now and Remove below each poster. Rate Now opens the rating form; Remove takes the movie off your list." },
      { question: "What happens after I rate a Watchlist movie?", answer: "After a successful rating, PopScore removes the movie from your Watchlist. The rating remains in your PopFile." },
      { question: "How does Movie Match choose recommendations?", answer: "Movie Match uses your selected genre, release-year range, language, and region preferences. For supported rating genres, personalized matching starts when you have at least three ratings of 75 or higher in that genre and uses those ratings to understand your taste. Until then, it shows general recommendations." },
      { question: "Why do I see movies I have already watched?", answer: "Movie Match excludes movies you have completed a PopScore rating for when you are signed in. It cannot know every movie you have seen, so watched but unrated movies can still appear." },
      { question: "Can I change the era, language, or region?", answer: "Yes. Movie Match lets you choose a movie era or custom starting year, preferred language, region, and whether to include international movies. A starting year is a lower limit rather than a single-year filter. Your preferences are remembered for later visits." },
      { question: "Can I browse by genre instead?", answer: "Yes. Use the home-page genre filters or genre pages to explore categories such as Horror, Comedy, Drama, Fantasy, Western, Rom-Com, and Superhero. A browsing category and the genre used for a movie's rating questions may differ." },
    ],
  },
  {
    title: "Movie DNA and Top 5",
    items: [
      { question: "What is Movie DNA?", answer: "Movie DNA summarizes patterns in your completed PopScore ratings: your genre preferences, average score, and how you rate Storyline, performance, and Rewatch Score. It unlocks after five eligible full ratings and changes as you rate more movies." },
      { question: "Which ratings count toward Movie DNA?", answer: "Movie DNA needs all five question answers. It uses your latest rating for each movie and excludes incomplete, deleted, and imported-only Letterboxd ratings. Acting, Voice Acting, and Character are compared as the shared performance measure." },
      { question: "What does my Movie DNA personality mean?", answer: "Story Seeker, Performance Fan, Rewatch Enthusiast, and Balanced Movie Fan describe patterns in your question scores. They are a summary of your movie ratings, not a personality test. You can explore the genre breakdown and share your Movie DNA graphic." },
      { question: "How do my Top 5 movies work?", answer: "Choose up to five unique movies for your PopFile and arrange them in your preferred order. These are your personal picks rather than an automatic list of your highest scores. Use the share option to create a Top 5 graphic." },
      { question: "How do achievements and rating streaks work?", answer: "Achievements recognize rating milestones, genre exploration, rating streaks, Movie Match ratings, and community participation. Your PopFile shows progress toward each achievement. Rating streaks track consecutive days of rating activity; changing a watched date does not create a rating streak." },
    ],
  },
  {
    title: "Watch Dates and Yearly Activity",
    items: [
      { question: "How are watched movies different from ratings?", answer: "A rating records your opinion; a watch records a viewing. You can keep one current rating for a movie and log multiple viewings, including rewatches. Your yearly activity uses watched dates rather than assuming every rating happened on the day you watched the movie." },
      { question: "Can I correct when I watched a movie?", answer: "Yes. Use the watched-date controls to set or correct a date. Future dates are not allowed. A movie saved as previously watched without a date stays in your ratings but does not count toward a year's viewing totals until it has a watched date." },
      { question: "How do I log a rewatch?", answer: "Use the rewatch action for a movie you have rated to add another viewing. You can adjust its watched date afterward. Updating your rating alone does not automatically add another viewing." },
      { question: "What does my yearly movie activity include?", answer: "It summarizes dated viewings for the selected year, including total watches, unique movies, rewatches, monthly activity, and estimated viewing time. It also highlights your highest-rated watched movie and most-rewatched movie when available. Viewing time depends on available runtime data. You can share an activity graphic." },
    ],
  },
  {
    title: "Community and Notifications",
    items: [
      { question: "What can I do in the community?", answer: "Browse ratings and reviews, start movie discussions, reply to other fans, like posts and comments, and follow people whose taste interests you. The Following feed helps you keep up with their ratings and discussions." },
      { question: "Do likes affect a movie's PopScore?", answer: "No. Likes show appreciation for a community post or comment. Only movie ratings contribute to the movie's PopScore." },
      { question: "What are discussions and mentions for?", answer: "Discussions give fans a place to ask movie questions, share theories, debate endings, and recommend titles. Use @mentions to bring another fan into a conversation. Keep posts and replies respectful and follow the validation messages shown by the form." },
      { question: "Where can I see notifications?", answer: "Use the notification bell or Notifications page to see activity such as follows, replies, likes, and mentions. Following someone helps you keep up with their movie activity." },
    ],
  },
  {
    title: "Emails and Preferences",
    items: [
      { question: "What is the PopScore Monthly Watchlist email?", answer: "It is a monthly movie-picks email, separate from the personal Watchlist you save on the site. Manage the Monthly Watchlist email preference in Edit PopFile or use the unsubscribe link in the email." },
      { question: "What is the yearly movie recap email?", answer: "The annual recap summarizes your dated movie activity for the previous year and is scheduled for January 1. Manage the yearly recap preference in Edit PopFile or unsubscribe using the link in a recap email." },
    ],
  },
];
