export default function Loading() {
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <div role="status" className="mx-auto max-w-6xl">
        <p className="text-sm font-bold text-yellow-300">Loading PopScore…</p>
        <div aria-hidden="true" className="mt-8 grid animate-pulse grid-cols-2 gap-5 motion-reduce:animate-none sm:grid-cols-4">
          {[0, 1, 2, 3].map(index => <div key={index} className="aspect-[2/3] rounded-2xl bg-slate-900" />)}
        </div>
      </div>
    </main>
  );
}
