import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 2678400,
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname:
          "/npm/emoji-datasource-apple@16.0.0/img/apple/64/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
