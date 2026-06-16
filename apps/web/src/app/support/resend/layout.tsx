import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Resend Sign-In Link",
  description: "Resend your EmberChamber beta magic-link sign-in email without contacting support.",
};

export default function ResendLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
