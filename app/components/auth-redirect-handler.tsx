"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeAuthRedirect } from "@/lib/profile-store";

export default function AuthRedirectHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/profile/edit") {
      return;
    }

    const authResult = consumeAuthRedirect();

    if (authResult.signedIn) {
      router.replace("/profile/edit");
    }
  }, [pathname, router]);

  return null;
}
