import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  // Required in Next.js 16: declare turbopack config so the webpack block below
  // doesn't trigger the "webpack config without turbopack config" error.
  // root silences the multiple-lockfiles workspace warning.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" },
    ],
  },
  webpack(config) {
    // Prevent socket.io-client from breaking server-side webpack builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
