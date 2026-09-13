import InviteLandingPageClient from "./page-client";

// Static-export shell param — invite codes/tokens are always read
// client-side via useParams(), so a single placeholder build-time param is
// sufficient (see next.config.js NEXT_OUTPUT=desktop). generateStaticParams
// must live in a Server Component file, which is why the actual page is
// split into page.tsx (server) + page-client.tsx ("use client").
export function generateStaticParams() {
  return [{ segments: [] }];
}

export default function InviteLandingPage() {
  return <InviteLandingPageClient />;
}
