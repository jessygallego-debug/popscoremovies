"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DesktopNavLink({ href, children, active }: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const pathname = usePathname();
  const destination = href.split(/[?#]/)[0];
  const isActive = active ?? (destination === "/"
    ? pathname === "/" || ["/movies/", "/movie/", "/genre/"].some(prefix => pathname.startsWith(prefix)) || pathname === "/rate"
    : pathname === destination || pathname.startsWith(destination + "/"));

  return (
    <Link href={href} aria-current={isActive ? "page" : undefined}
      className={`relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-sm font-semibold transition-colors after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-yellow-400 after:transition-opacity focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400 ${isActive ? "text-yellow-400 after:opacity-100" : "text-slate-300 after:opacity-0 hover:text-white"}`}>
      {children}
    </Link>
  );
}
