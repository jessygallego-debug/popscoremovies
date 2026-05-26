import type { ReactNode } from "react";
import ProfileUsernameLink from "@/app/components/profile-username-link";

const MENTION_PATTERN = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,24})(?=\b)/g;

export default function MentionText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  Array.from(text.matchAll(MENTION_PATTERN)).forEach((match, index) => {
    const prefix = match[1];
    const username = match[2];
    const mentionStart = (match.index ?? 0) + prefix.length;
    const mentionEnd = mentionStart + username.length + 1;

    if (mentionStart > cursor) {
      parts.push(text.slice(cursor, mentionStart));
    }

    parts.push(
      <ProfileUsernameLink
        key={`${username}-${mentionStart}-${index}`}
        username={username}
        className="font-black text-yellow-200"
      >
        @{username}
      </ProfileUsernameLink>
    );
    cursor = mentionEnd;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <>{parts.length ? parts : text}</>;
}
