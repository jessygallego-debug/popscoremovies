async function getTrendingMovies() {
  const response = await fetch(
    "https://api.themoviedb.org/3/trending/movie/week",
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
      },
    }
  );

  return response.json();
}

export default async function Home() {
  const data = await getTrendingMovies();

  const movies = data.results?.slice(0, 8) || [];

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12">
      <section className="max-w-7xl mx-auto">
        <p className="text-yellow-400 font-bold mb-3">
          🍿 PopScore Movies
        </p>

        <h1 className="text-6xl font-black mb-4">
          Discover Movies Worth Watching
        </h1>

        <p className="text-gray-300 text-xl mb-12">
          Genre-weighted movie ratings built for real fans.
        </p>

        <h2 className="text-3xl font-bold mb-6">
          Trending Movies
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {movies.map((movie: any) => (
            <a
  key={movie.id}
  href={`/movie/${movie.id}`}
  className="bg-gray-900 rounded-2xl overflow-hidden hover:scale-105 transition block"
>
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-[400px] object-cover"
                />
              )}

              <div className="p-4">
                <h3 className="font-bold text-lg">
                  {movie.title}
                </h3>

                <p className="text-gray-400 text-sm mt-2">
                  TMDB Rating: {movie.vote_average?.toFixed(1)}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}