/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep standalone output available for containerized deployment paths without
  // changing the default web build used by local dev and CI.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

module.exports = nextConfig;
