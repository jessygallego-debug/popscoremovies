"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  consumeAuthRedirect,
  getCurrentUser,
  getProfileByUserId,
} from "@/lib/profile-store";

export default function AuthRedirectHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/profile/edit") {
      return;
    }

    const authResult = consumeAuthRedirect();

    if (authResult.signedIn) {
      getCurrentUser().then((user) => {
        if (!user) {
          router.replace("/profile/edit");
          return;
        }

        getProfileByUserId(user.id).then((profile) => {
          router.replace(profile ? "/" : "/profile/edit");
        });
      });
    }
  }, [pathname, router]);

  return null;
}
