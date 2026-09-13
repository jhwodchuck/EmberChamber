import { Suspense } from "react";
import { createMetadata } from "@/lib/metadata";
import RegisterPageClient from "./page-client";

export const metadata = createMetadata({
  title: "Join Beta",
  description:
    "Start invite-only EmberChamber beta onboarding with a private email bootstrap.",
  path: "/register",
  noIndex: true,
});

// `?next=` is read client-side via useSearchParams() (see page-client.tsx)
// instead of the server `searchParams` prop, so this page is compatible
// with `output: "export"` (the desktop static-export build). Suspense is
// required by Next.js around any useSearchParams() consumer.
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageClient />
    </Suspense>
  );
}
