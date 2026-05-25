"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePopFile } from "@/app/components/popfile-provider";
import {
  consumeAuthRedirect,
  getCurrentUser,
  getProfileByUserId,
} from "@/lib/profile-store";

export default function AuthRedirectHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshProfile } = usePopFile();

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
          void refreshProfile();
          router.replace(profile ? "/" : "/profile/edit");
        });
      });
    }
  }, [pathname, refreshProfile, router]);

  return null;
}
