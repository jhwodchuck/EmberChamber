import type { Metadata } from "next";
import { CompanionShell } from "@/components/companion-shell";

// Authenticated workspace: client-rendered, per-user content with no public
// value. Keep it out of the index to protect crawl budget and result quality.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <CompanionShell>{children}</CompanionShell>;
}
