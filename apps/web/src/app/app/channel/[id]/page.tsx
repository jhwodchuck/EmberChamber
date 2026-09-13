import ChannelPageClient from "./page-client";

// Static-export shell param — this page's content is identical for every
// id, and desktop only ever reaches it via client-side navigation, so a
// single placeholder build-time param is sufficient (see next.config.js
// NEXT_OUTPUT=desktop). generateStaticParams must live in a Server
// Component file, which is why the actual page is split into page.tsx
// (server) + page-client.tsx ("use client").
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ChannelPage() {
  return <ChannelPageClient />;
}
