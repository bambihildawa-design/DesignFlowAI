import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "figma-alpha-api.s3.us-west-2.amazonaws.com" },
    ],
  },
  experimental: {
    // Server Actions are stable in Next 15, kept explicit for clarity/documentation.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
