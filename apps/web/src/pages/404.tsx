import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { RecoveryPanel } from "@/components/recovery-panel";

export default function LegacyNotFoundPage() {
  return (
    <MarketingShell>
      <RecoveryPanel
        eyebrow="Not found"
        statusCode={404}
        title="That route is not available."
        description="The legacy page fallback only appears when a route misses the App Router. Try a known entry point instead of staying in a dead end."
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
