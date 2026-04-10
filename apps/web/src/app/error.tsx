"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RecoveryPanel } from "@/components/recovery-panel";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RecoveryPanel
      eyebrow="Route error"
      statusCode={500}
      title="This page did not finish loading cleanly."
      description="The request failed inside the web app. Retry the route first, then use the support page if the same failure keeps coming back."
    >
      <div className="space-y-5">
        {error.digest ? (
          <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              Support code:
            </span>{" "}
            <span className="font-mono">{error.digest}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Retry This Page
          </button>
          <Link href="/app" className="btn-ghost">
            Open the App
          </Link>
          <Link href="/support" className="btn-ghost">
            Get Support
          </Link>
        </div>
      </div>
    </RecoveryPanel>
  );
}
