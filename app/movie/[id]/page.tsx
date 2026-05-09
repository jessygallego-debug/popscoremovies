async function getMovies(query?: string) {
  const url = query
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        query
      )}&include_adult=false&language=en-US&page=1`
    : "https://api.themoviedb.org/3/trending/movie/week?language=en-US";

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
    },
    cache: "no-store",
  });

  return response.json();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";

  const data = await getMovies(query);
  const movies = data.results?.slice(0, 30) || [];

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12">
      <section className="max-w-7xl mx-auto">
        <p className="text-yellow-400 font-bold mb-3">🍿 PopScore Movies</p>

        <h1 className="text-6xl font-black mb-4">
          Discover Movies Worth Watching
        </h1>

        <p className="text-gray-300 text-xl mb-8">
          Genre-weighted movie ratings built for real fans.
        </p>

        <form className="mb-12 flex gap-3" action="/">
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Search for a movie..."
            className="w-full rounded-xl bg-gray-900 border border-gray-700 px-5 py-4 text-white outline-none focus:border-yellow-400"
          />

          <button
            type="submit"
            className="bg-yellow-400 text-black px-6 py-4 rounded-xl font-bold hover:bg-yellow-300"
          >
            Search
          </button>
        </form>

        <h2 className="text-3xl font-bold mb-6">
          {query ? `Search Results for "${query}"` : "Trending Movies"}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie: any) => (
            <a
              key={movie.id}
              href={`/movie/${movie.id}`}
              className="bg-gray-900 rounded-2xl overflow-hidden hover:scale-105 transition block cursor-pointer"
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-[360px] object-cover"
                />
              ) : (
                <div className="w-full h-[360px] bg-gray-800 flex items-center justify-center text-gray-500">
                  No Poster
                </div>
              )}

              <div className="p-4">
                <h3 className="font-bold text-lg">{movie.title}</h3>

                <p className="text-yellow-400 font-bold text-sm mt-2">
                  PopScore: Not rated yet
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}