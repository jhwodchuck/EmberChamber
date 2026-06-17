"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import { relayAdminApi, type AdminAuditEvent } from "@/lib/relay";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<{ state: LoadStatus; message?: string }>(
    { state: "idle" },
  );

  const load = useCallback(async (after?: string) => {
    setStatus({ state: "loading" });
    try {
      const result = await relayAdminApi.listAuditLog(after);
      setEvents((current) =>
        after ? [...current, ...result.events] : result.events,
      );
      setCursor(result.nextCursor);
      setStatus({ state: "ready" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load audit log.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Every operator and break-glass action, newest first.
        </p>
        <button type="button" onClick={() => void load()} className="btn-ghost">
          Refresh
        </button>
      </div>

      {status.state === "error" ? (
        <StatusCallout
          tone="error"
          title="Audit log did not load"
          action={
            <button type="button" onClick={() => void load()} className="btn-ghost">
              Retry
            </button>
          }
        >
          {status.message}
        </StatusCallout>
      ) : null}

      {status.state === "ready" && events.length === 0 ? (
        <p className="py-8 text-center text-[var(--text-secondary)]">
          No audit events recorded yet.
        </p>
      ) : null}

      {events.map((event) => (
        <div key={event.id} className="card">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {event.action}
            </span>
            <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
              {event.actorKind}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {formatUtcDate(event.createdAt)} UTC
            {event.actorAccountId
              ? ` · by ${event.actorAccountId.slice(0, 8)}…`
              : ""}
            {event.targetAccountId
              ? ` · target account ${event.targetAccountId.slice(0, 8)}…`
              : ""}
            {event.targetConversationId
              ? ` · target conversation ${event.targetConversationId.slice(0, 8)}…`
              : ""}
          </p>
          {event.metadata != null &&
          Object.keys(event.metadata as object).length > 0 ? (
            <pre className="mt-2 overflow-x-auto rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}

      {cursor ? (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => void load(cursor)}
            disabled={status.state === "loading"}
            className="btn-ghost disabled:opacity-50"
          >
            {status.state === "loading" ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
