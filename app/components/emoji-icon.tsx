import Image from "next/image";

const POPCORN_EMOJI = "🍿";
const TWEMOJI_BASE_URL =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";

function emojiCodePoint(emoji: string) {
  return Array.from(emoji)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter((codePoint) => codePoint && codePoint !== "fe0f")
    .join("-");
}

export default function EmojiIcon({
  emoji,
  label,
  size = 24,
}: {
  emoji: string;
  label?: string;
  size?: number;
}) {
  const isPopcorn = emoji === POPCORN_EMOJI;
  const src = isPopcorn
    ? "/rating-icons/fresh-popcorn.png"
    : `${TWEMOJI_BASE_URL}/${emojiCodePoint(emoji)}.svg`;

  return (
    <Image
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      unoptimized={!isPopcorn}
      className="inline-block shrink-0 object-contain"
    />
  );
}
