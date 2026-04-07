/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Relay origin – used for both the Content-Security-Policy connect-src and the
// image remotePatterns. We derive it at build time from the public env var so
// the CSP is specific rather than relying on broad wildcards.
// ---------------------------------------------------------------------------
const relayRawUrl =
  process.env.NEXT_PUBLIC_RELAY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

let relayOrigin = "http://127.0.0.1:8787";
let relayWsOrigin = "ws://127.0.0.1:8787";
let relayHostname = "127.0.0.1";
let relayProtocol = "http";

try {
  const u = new URL(relayRawUrl);
  relayOrigin = u.origin;
  relayHostname = u.hostname;
  relayProtocol = u.protocol.replace(":", "");
  relayWsOrigin = relayOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
} catch {
  // Keep defaults above if the URL cannot be parsed.
}

// ---------------------------------------------------------------------------
// Content-Security-Policy
//
// Next.js App Router requires 'unsafe-inline' in script-src because it
// injects inline hydration bootstraps and we also use a small inline theme-
// init script in layout.tsx to prevent flash-of-wrong-theme.  Without a per-
// request nonce approach (which requires middleware and is left as a future
// hardening task), 'unsafe-inline' is the pragmatic baseline.
//
// The other directives still provide meaningful protection:
//   frame-ancestors 'none'   – prevents all clickjacking
//   base-uri 'self'          – prevents <base> tag injection
//   form-action 'self'       – prevents form-redirect hijacking
//   object-src 'none'        – eliminates Flash / legacy plugin surface
//   connect-src              – restricts fetch/XHR/WebSocket to self + relay
//   img-src data: blob:      – allows QR code data-URLs and blob attachment previews
// ---------------------------------------------------------------------------
const cspDirectives = [
  "default-src 'self'",
  // Next.js requires unsafe-inline; 'unsafe-eval' is only needed in dev/HMR
  // mode – it is intentionally absent here so production builds are cleaner.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  // Radix UI and Tailwind generate inline styles.
  "style-src 'self' 'unsafe-inline'",
  // next/font downloads fonts at build time and serves them from self.
  "font-src 'self' data:",
  // data: for QR code PNG data-URLs; blob: for attachment media previews;
  // relay origin for relay-hosted avatar/attachment thumbnails.
  `img-src 'self' data: blob: ${relayOrigin}`,
  // WebSocket connections to the relay mailbox and group sockets.
  `connect-src 'self' ${relayOrigin} ${relayWsOrigin}`,
  // Local audio/video playback from blob-decrypted attachments.
  "media-src 'self' blob:",
  // No plugin/Flash surface.
  "object-src 'none'",
  // Prevent this page from being framed anywhere.
  "frame-ancestors 'none'",
  // Prevent <base> tag injection attacks.
  "base-uri 'self'",
  // Prevent form POST redirect hijacking.
  "form-action 'self'",
].join("; ");

// ---------------------------------------------------------------------------
// Security headers applied to every route.
// ---------------------------------------------------------------------------
const securityHeaders = [
  // Clickjacking – belt-and-suspenders with frame-ancestors in CSP above.
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing attacks.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin only on same-origin requests; omit it on cross-origin
  // downgrade (HTTPS → HTTP) to avoid leaking paths in Referer headers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict powerful feature APIs to only what the app actually uses.
  // Camera permission is requested client-side by the QR scanner; the
  // Permissions-Policy header still allows it but does not auto-grant it.
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",        // QR device-link scanner
      "microphone=()",        // not used
      "geolocation=()",       // not used
      "payment=()",           // not used
      "usb=()",               // not used
      "interest-cohort=()",   // FLoC opt-out
    ].join(", "),
  },
  // Keep browsing contexts isolated from opener pages opened by magic-link
  // redirects.  same-origin-allow-popups preserves the deep-link fallback
  // window.location.href = appDeepLink flow on mobile without breaking it.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Content-Security-Policy – see rationale above.
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig = {
  reactStrictMode: true,
  // Keep standalone output available for containerised deployment paths without
  // changing the default web build used by local dev and CI.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  eslint: {
    // Lint runs as a dedicated CI step; avoid Next.js build-time lint plugin
    // incompatibilities in workspace installs from blocking production builds.
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    // Restrict Next.js image optimisation to explicit trusted origins only.
    // All brand assets are local (/brand/*). QR codes use data: URLs via the
    // `unoptimised` prop and are not governed by this list.  The relay origin
    // covers any relay-hosted avatar or thumbnail that is loaded via
    // next/image in the future.
    //
    // The previous wildcard `{ hostname: "**" }` was removed because it
    // permitted server-side proxying of any HTTPS URL, unnecessarily expanding
    // the SSRF and request-forgery surface.
    remotePatterns: [
      // Relay-hosted assets (avatars, thumbnails).
      { protocol: relayProtocol, hostname: relayHostname },
      // Local development relay.
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

module.exports = nextConfig;
