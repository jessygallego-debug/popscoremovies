import Link from "next/link";

export default function BrandHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to PopScore Movies home"
      className="mb-3 inline-flex items-center gap-2 text-lg font-bold text-yellow-400 transition hover:text-yellow-300 sm:text-xl"
    >
      <span aria-hidden="true" className="text-xl sm:text-2xl">
        🍿
      </span>
      <span>PopScore Movies</span>
    </Link>
  );
}
