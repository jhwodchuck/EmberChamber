"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import {
  relayAdminApi,
  type AdminReportDetail,
  type AdminReportSummary,
} from "@/lib/relay";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const STATUS_FILTERS = [
  "all",
  "open",
  "reviewing",
  "actioned",
  "dismissed",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const NEXT_ACTIONS: {
  status: AdminReportSummary["status"];
  label: string;
}[] = [
  { status: "reviewing", label: "Mark reviewing" },
  { status: "actioned", label: "Mark actioned" },
  { status: "dismissed", label: "Dismiss" },
];

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [status, setStatus] = useState<{ state: LoadStatus; message?: string }>(
    { state: "idle" },
  );
  const [selected, setSelected] = useState<AdminReportDetail | null>(null);
  const [note, setNote] = useState("");
  const [isActioning, setIsActioning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchNote, setBatchNote] = useState("");
  const [isBatchActioning, setIsBatchActioning] = useState(false);

  const loadReports = useCallback(async () => {
    setStatus({ state: "loading" });
    setSelectedIds(new Set());
    try {
      const result = await relayAdminApi.listReports(
        filter === "all" ? {} : { status: filter },
      );
      setReports(result.reports);
      setStatus({ state: "ready" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load reports.",
      });
    }
  }, [filter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function openReport(reportId: string) {
    try {
      const detail = await relayAdminApi.getReport(reportId);
      setSelected(detail);
      setNote(detail.resolutionNote ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open report.");
    }
  }

  async function applyAction(nextStatus: AdminReportSummary["status"]) {
    if (!selected) return;
    setIsActioning(true);
    try {
      await relayAdminApi.updateReport(selected.id, {
        status: nextStatus,
        resolutionNote: note.trim() || undefined,
      });
      toast.success(`Report marked ${nextStatus}.`);
      setSelected(null);
      await loadReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setIsActioning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map((r) => r.id)));
    }
  }

  async function applyBatchAction(nextStatus: "reviewing" | "actioned" | "dismissed") {
    if (selectedIds.size === 0) return;
    setIsBatchActioning(true);
    try {
      const result = await relayAdminApi.batchUpdateReports(
        [...selectedIds],
        nextStatus,
        batchNote.trim() || undefined,
      );
      toast.success(`${result.updated} report${result.updated === 1 ? "" : "s"} marked ${nextStatus}.`);
      setSelectedIds(new Set());
      setBatchNote("");
      await loadReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch update failed.");
    } finally {
      setIsBatchActioning(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={
                  filter === value
                    ? "rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600"
                    : "rounded-full px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void loadReports()} className="btn-ghost">
            Refresh
          </button>
        </div>

        {reports.length > 0 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {selectedIds.size === reports.length ? "Deselect all" : "Select all"}
            </button>
            {selectedIds.size > 0 ? (
              <span className="text-xs text-[var(--text-secondary)]">
                {selectedIds.size} selected
              </span>
            ) : null}
          </div>
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 space-y-2">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Batch action — {selectedIds.size} report{selectedIds.size === 1 ? "" : "s"}
            </p>
            <textarea
              value={batchNote}
              onChange={(event) => setBatchNote(event.target.value)}
              rows={2}
              placeholder="Resolution note (optional)"
              className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <div className="flex flex-wrap gap-2">
              {NEXT_ACTIONS.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() =>
                    void applyBatchAction(
                      action.status as "reviewing" | "actioned" | "dismissed",
                    )
                  }
                  disabled={isBatchActioning}
                  className="btn-ghost border border-[var(--border)] text-xs disabled:opacity-50"
                >
                  {isBatchActioning ? "Applying…" : action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {status.state === "loading" ? (
          <StatusCallout tone="info" title="Loading reports">
            Fetching the report queue.
          </StatusCallout>
        ) : null}

        {status.state === "error" ? (
          <StatusCallout
            tone="error"
            title="Reports did not load"
            action={
              <button type="button" onClick={() => void loadReports()} className="btn-ghost">
                Retry
              </button>
            }
          >
            {status.message}
          </StatusCallout>
        ) : null}

        {status.state === "ready" && reports.length === 0 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">
            No reports in this view.
          </p>
        ) : null}

        {reports.map((report) => (
          <div key={report.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selectedIds.has(report.id)}
              onChange={() => toggleSelect(report.id)}
              className="mt-3 h-4 w-4 flex-shrink-0 rounded accent-brand-500"
              aria-label={`Select report ${report.reason}`}
            />
            <button
              type="button"
              onClick={() => void openReport(report.id)}
              className={
                selected?.id === report.id
                  ? "card w-full border-brand-500 text-left"
                  : "card w-full text-left transition-colors hover:border-brand-500"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {report.reason}
                </span>
                <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                  {report.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {report.targetAccountId
                  ? `Target account ${report.targetAccountId.slice(0, 8)}…`
                  : report.targetConversationId
                    ? `Target conversation ${report.targetConversationId.slice(0, 8)}…`
                    : "No specific target"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Filed {formatUtcDate(report.createdAt)} UTC
              </p>
            </button>
          </div>
        ))}
      </div>

      <div>
        {selected ? (
          <div className="card space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {selected.reason}
                </h2>
                <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                  {selected.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Reported by @{selected.reporterUsername} ·{" "}
                {formatUtcDate(selected.createdAt)} UTC
              </p>
            </div>

            <div className="space-y-1 text-sm text-[var(--text-secondary)]">
              {selected.targetAccountId ? (
                <p>Target account: {selected.targetAccountId}</p>
              ) : null}
              {selected.targetConversationId ? (
                <p>Target conversation: {selected.targetConversationId}</p>
              ) : null}
              {selected.targetAttachmentId ? (
                <p>Target attachment: {selected.targetAttachmentId}</p>
              ) : null}
              {selected.evidenceMessageIds.length ? (
                <p>Evidence messages: {selected.evidenceMessageIds.length}</p>
              ) : null}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Disclosed payload
              </p>
              <pre className="max-h-64 overflow-auto rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)]">
                {JSON.stringify(selected.disclosedPayload, null, 2)}
              </pre>
            </div>

            <div>
              <label
                htmlFor="resolution-note"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
              >
                Resolution note
              </label>
              <textarea
                id="resolution-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)]"
                placeholder="What action was taken?"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {NEXT_ACTIONS.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => void applyAction(action.status)}
                  disabled={isActioning}
                  className="btn-ghost border border-[var(--border)] disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-sm text-[var(--text-secondary)]">
            Select a report to view its disclosure payload and take action.
          </div>
        )}
      </div>
    </div>
  );
}
