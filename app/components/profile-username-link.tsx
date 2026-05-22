import Link from "next/link";
import type { ReactNode } from "react";

export function profileStatsHref(username: string) {
  return `/profile/${encodeURIComponent(username.replace(/^@/, ""))}?tab=stats`;
}

export default function ProfileUsernameLink({
  children,
  className = "",
  username,
}: {
  children: ReactNode;
  className?: string;
  username: string;
}) {
  return (
    <Link
      href={profileStatsHref(username)}
      className={`transition hover:text-yellow-300 ${className}`}
    >
      {children}
    </Link>
  );
}
