"use client";

import { usePathname, useSearchParams } from "next/navigation";
import DesktopNavLink from "@/app/components/desktop-nav-link";
import { usePopFile } from "@/app/components/popfile-provider";

export default function DesktopStatsLink() {
  const { profile } = usePopFile();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!profile) return null;

  return (
    <DesktopNavLink
      href={`/profile/${encodeURIComponent(profile.username)}?tab=stats`}
      active={pathname === `/profile/${encodeURIComponent(profile.username)}` && !["ratings", "reviews", "achievements", "activity"].includes(searchParams.get("tab") ?? "stats")}
    >
      Stats
    </DesktopNavLink>
  );
}
