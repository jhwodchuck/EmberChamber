import { CompanionShell } from "@/components/companion-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <CompanionShell>{children}</CompanionShell>;
}
