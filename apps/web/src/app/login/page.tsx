import { Suspense } from "react";
import { createMetadata } from "@/lib/metadata";
import LoginPageClient from "./page-client";

export const metadata = createMetadata({
  title: "Sign In",
  description:
    "Request a private email magic link for an existing EmberChamber beta account.",
  path: "/login",
  noIndex: true,
});

// `?next=` / `?method=` are read client-side via useSearchParams() (see
// page-client.tsx) instead of the server `searchParams` prop, so this page
// is compatible with `output: "export"` (the desktop static-export build).
// Suspense is required by Next.js around any useSearchParams() consumer.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
