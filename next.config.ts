import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    // The chart was built at /chart; it is `/` now. Temporary, in case the move is undone.
    return [{ source: "/chart", destination: "/", permanent: false }];
  },
};

export default nextConfig;
