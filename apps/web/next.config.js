/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output so Tauri can bundle the app without a Node.js server.
  // When running inside a Tauri shell NEXT_PUBLIC_TAURI is set to "1".
  output: process.env.NEXT_PUBLIC_TAURI === "1" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
