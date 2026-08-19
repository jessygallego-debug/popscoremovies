import Link from "next/link";
import EmojiIcon from "@/app/components/emoji-icon";

export default function BrandHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Go to PopScore Movies home"
      className="mb-3 inline-flex items-center gap-2 text-lg font-bold text-yellow-400 transition hover:text-yellow-300 sm:text-xl"
    >
      <EmojiIcon emoji="🍿" size={28} />
      <span>PopScore Movies</span>
    </Link>
  );
}
