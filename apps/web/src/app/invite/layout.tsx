import type { Metadata } from "next";

// Invite landing pages are token-gated and per-recipient — no public index value.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
