import Image from "next/image";

const APPLE_EMOJI_BASE_URL =
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64";

function emojiCodePoint(emoji: string) {
  return Array.from(emoji)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter(Boolean)
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
  const src = `${APPLE_EMOJI_BASE_URL}/${emojiCodePoint(emoji)}.png`;

  return (
    <Image
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      unoptimized
      className="inline-block shrink-0 object-contain"
    />
  );
}
