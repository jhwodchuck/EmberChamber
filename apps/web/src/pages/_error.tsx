import type { NextPageContext } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { RecoveryPanel } from "@/components/recovery-panel";

interface ErrorPageProps {
  statusCode?: number;
}

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <MarketingShell>
      <RecoveryPanel
        eyebrow="Request failed"
        statusCode={statusCode ?? 500}
        title="The web request did not complete."
        description="Use the status code below when you file support. A refresh may fix transient failures, but repeated errors need a report with the route and time."
      >
        <div className="space-y-5">
          <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              Support code:
            </span>{" "}
            HTTP {statusCode ?? 500}
          </div>

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
        </div>
      </RecoveryPanel>
    </MarketingShell>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};
