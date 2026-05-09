import Link from "next/link";

export default function BrandHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to PopScore Movies home"
      className="mb-3 inline-flex items-center gap-2 font-bold text-yellow-400 transition hover:text-yellow-300"
    >
      <span aria-hidden="true">🍿</span>
      <span>PopScore Movies</span>
    </Link>
  );
}
