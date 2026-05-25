import type { Metadata } from "next";
import NotificationsClient from "@/app/notifications/notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
