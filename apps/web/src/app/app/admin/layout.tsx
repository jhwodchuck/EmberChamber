"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusCallout } from "@/components/status-callout";
import { relayAccountApi } from "@/lib/relay";

type GateState = "checking" | "operator" | "denied";

const tabs = [
  { href: "/app/admin", label: "Reports" },
  { href: "/app/admin/account", label: "Account actions" },
  { href: "/app/admin/audit", label: "Audit log" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [gate, setGate] = useState<GateState>("checking");

  useEffect(() => {
    let cancelled = false;
    void relayAccountApi
      .operatorStatus()
      .then((result) => {
        if (!cancelled) setGate(result.isOperator ? "operator" : "denied");
      })
      .catch(() => {
        if (!cancelled) setGate("denied");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === "checking") {
    return (
      <div className="p-6">
        <StatusCallout tone="info" title="Checking operator access">
          Confirming your account has operator permissions.
        </StatusCallout>
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="p-6">
        <StatusCallout tone="error" title="Operator access required">
          This area is limited to accounts with operator permissions. If you
          believe you should have access, contact another operator to enable it.
        </StatusCallout>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Operator
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Moderation &amp; recovery
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review reports, act on accounts, and audit operator activity. Every
          action here is recorded in the audit log.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2"
        aria-label="Operator sections"
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/app/admin"
              ? pathname === "/app/admin"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                isActive
                  ? "rounded-full bg-brand-500/10 px-3 py-1.5 text-sm font-medium text-brand-600"
                  : "rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
