import CommunityDetailPageClient from "./page-client";

// Static-export shell param — the real id is always read client-side via
// useParams()/the relay API, and desktop only ever reaches this page via
// client-side navigation, so a single placeholder build-time param is
// sufficient (see next.config.js NEXT_OUTPUT=desktop). generateStaticParams
// must live in a Server Component file, which is why the actual page is
// split into page.tsx (server) + page-client.tsx ("use client").
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function CommunityDetailPage() {
  return <CommunityDetailPageClient />;
}
