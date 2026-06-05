import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthRedirectHandler from "@/app/components/auth-redirect-handler";
import { PopFileProvider } from "@/app/components/popfile-provider";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "PopScore Movies",
    template: "%s | PopScore Movies",
  },
  description:
    "Movie rating built for true fans - because horror shouldn't be rated like comedy.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "PopScore Movies",
    description:
      "Movie rating built for true fans - because horror shouldn't be rated like comedy.",
    siteName: "PopScore Movies",
    type: "website",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "PopScore Movies",
    description:
      "Movie rating built for true fans - because horror shouldn't be rated like comedy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link
          rel="icon"
          href="/icon.png?v=extra-buttery-3"
          type="image/png"
          sizes="256x256"
        />
        <link
          rel="shortcut icon"
          href="/favicon.ico?v=extra-buttery-3"
          sizes="any"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon.png?v=extra-buttery-3"
          type="image/png"
          sizes="180x180"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PopFileProvider>
          <AuthRedirectHandler />
          {children}
        </PopFileProvider>
        <Analytics />
      </body>
    </html>
  );
}
