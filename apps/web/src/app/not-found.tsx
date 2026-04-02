import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { RecoveryPanel } from "@/components/recovery-panel";

export default function NotFound() {
  return (
    <MarketingShell>
      <RecoveryPanel
        eyebrow="Not found"
        statusCode={404}
        title="That page is not part of the chamber."
        description="The link may be stale, private, or simply not shipped yet. Start from a known route or use support if you expected this page to exist."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back Home
          </Link>
          <Link href="/app" className="btn-ghost">
            Open the App
          </Link>
          <Link href="/support" className="btn-ghost">
            Get Support
          </Link>
        </div>
      </RecoveryPanel>
    </MarketingShell>
  );
}
