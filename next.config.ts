import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300, // 5 min — revisited tabs reuse in-memory RSC payload
      static: 300,
    },
  },
};

export default nextConfig;
