import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check Invite Code",
  description: "Verify whether your EmberChamber beta invite code is still valid before registering.",
};

export default function InviteCheckLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
