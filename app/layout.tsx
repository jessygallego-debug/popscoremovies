import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthRedirectHandler from "@/app/components/auth-redirect-handler";
import { PopFileProvider } from "@/app/components/popfile-provider";
import {
  SITE_APPLE_ICON_PATH,
  SITE_DESCRIPTION,
  SITE_ICON_ALT,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/site-metadata";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteImage = {
  url: absoluteUrl(SITE_ICON_PATH),
  width: 256,
  height: 256,
  alt: SITE_ICON_ALT,
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: SITE_ICON_PATH, type: "image/png", sizes: "256x256" },
    ],
    shortcut: SITE_ICON_PATH,
    apple: [{ url: SITE_APPLE_ICON_PATH, type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [siteImage],
    siteName: SITE_NAME,
    type: "website",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [siteImage],
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href={SITE_ICON_PATH}
          type="image/png"
          sizes="256x256"
        />
        <link
          rel="shortcut icon"
          href={SITE_ICON_PATH}
          type="image/png"
          sizes="256x256"
        />
        <link
          rel="apple-touch-icon"
          href={SITE_APPLE_ICON_PATH}
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
