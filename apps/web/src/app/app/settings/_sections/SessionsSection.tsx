import { DeviceLinkPanel } from "@/components/device-link-panel";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";

export interface Session {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

interface SessionsSectionProps {
  sessions: Session[];
  sessionsStatus: { state: "idle" | "loading" | "ready" | "error"; message?: string };
  revokedSessionNotice: { deviceLabel: string } | null;
  revokingSessionId: string | null;
  onRefresh: () => void;
  onRevoke: (sessionId: string) => void;
}

export function SessionsSection({
  sessions,
  sessionsStatus,
  revokedSessionNotice,
  revokingSessionId,
  onRefresh,
  onRevoke,
}: SessionsSectionProps) {
  return (
    <div
      id="settings-panel-sessions"
      role="tabpanel"
      aria-labelledby="settings-tab-sessions"
      className="space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          These are the devices that still have a valid relay session for
          your account.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-ghost shrink-0"
        >
          Refresh
        </button>
      </div>

      <DeviceLinkPanel signedIn className="space-y-4" />

      {revokedSessionNotice ? (
        <StatusCallout tone="success" title="Session revoked">
          {revokedSessionNotice.deviceLabel} lost this sign-in. That device
          must request a new magic link before it can get back into the
          account.
        </StatusCallout>
      ) : null}

      {sessionsStatus.state === "loading" ? (
        <StatusCallout tone="info" title="Loading active sessions">
          The relay is checking which devices still have access.
        </StatusCallout>
      ) : null}

      {sessionsStatus.state === "error" ? (
        <StatusCallout
          tone="error"
          title="Sessions did not load"
          action={
            <button type="button" onClick={onRefresh} className="btn-ghost">
              Retry
            </button>
          }
        >
          {sessionsStatus.message}
        </StatusCallout>
      ) : null}

      {sessionsStatus.state === "ready" && sessions.length === 0 ? (
        <p className="py-8 text-center text-[var(--text-secondary)]">
          No active sessions found.
        </p>
      ) : null}

      {sessionsStatus.state === "ready"
        ? sessions.map((session) => (
            <div
              key={session.id}
              className="card flex items-center justify-between gap-4"
            >
              <div>
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {session.deviceLabel}
                  </span>
                  {session.isCurrent ? (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-500">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Created {formatUtcDate(session.createdAt)} UTC · Last seen{" "}
                  {formatUtcDate(session.lastSeenAt)} UTC
                </p>
              </div>

              {!session.isCurrent ? (
                <button
                  type="button"
                  onClick={() => onRevoke(session.id)}
                  className="text-sm text-red-400 hover:text-red-500 disabled:opacity-50"
                  disabled={revokingSessionId === session.id}
                  aria-label={`Revoke session for ${session.deviceLabel}`}
                >
                  {revokingSessionId === session.id ? "Revoking…" : "Revoke"}
                </button>
              ) : null}
            </div>
          ))
        : null}
    </div>
  );
}
