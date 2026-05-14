import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthRedirectHandler from "@/app/components/auth-redirect-handler";
import "./globals.css";

export const metadata: Metadata = {
  title: "PopScore Movies",
  description:
    "Movie rating built for true fans - because horror shouldn't be rated like comedy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthRedirectHandler />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
