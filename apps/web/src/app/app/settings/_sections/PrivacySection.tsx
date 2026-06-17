import { Switch } from "@emberchamber/ui/components";
import { StatusCallout } from "@/components/status-callout";

type PrivacyState = {
  notificationPreviewMode: "discreet" | "expanded" | "none";
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
  // Synced server-side; surfaced through the Appearance tab rather than here.
  oledDark: boolean;
};

interface PrivacySectionProps {
  privacy: PrivacyState;
  setPrivacy: React.Dispatch<React.SetStateAction<PrivacyState>>;
  privacyStatus: { state: "idle" | "loading" | "ready" | "error"; message?: string };
  isSavingPrivacy: boolean;
  onRetry: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const privacyToggleFields = [
  {
    key: "autoDownloadSensitiveMedia" as const,
    label: "Auto-download sensitive media",
    description:
      "Leave this off unless you want private media cached automatically on this device.",
  },
  {
    key: "allowSensitiveExport" as const,
    label: "Allow sensitive export",
    description:
      "Keep this off to discourage saving intimate media outside the app vault.",
  },
  {
    key: "secureAppSwitcher" as const,
    label: "Secure app switcher",
    description:
      "Request secure-window behavior on supported devices to reduce snapshot leakage.",
  },
] as const;

export function PrivacySection({
  privacy,
  setPrivacy,
  privacyStatus,
  isSavingPrivacy,
  onRetry,
  onSubmit,
}: PrivacySectionProps) {
  const controlsDisabled = privacyStatus.state !== "ready" || isSavingPrivacy;

  return (
    <form
      id="settings-panel-privacy"
      role="tabpanel"
      aria-labelledby="settings-tab-privacy"
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <div className="card border-brand-500/20 bg-brand-500/5">
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          Sensitive-media defaults
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          The beta assumes intimate media should stay discreet by default.
          These controls bias toward in-app viewing, private vault storage,
          and less visible device behavior.
        </p>
      </div>

      {privacyStatus.state === "loading" ? (
        <StatusCallout tone="info" title="Loading current privacy settings">
          The relay is refreshing your current defaults before you make
          changes.
        </StatusCallout>
      ) : null}

      {privacyStatus.state === "error" ? (
        <StatusCallout
          tone="error"
          title="Privacy settings did not load"
          action={
            <button type="button" onClick={onRetry} className="btn-ghost">
              Retry
            </button>
          }
        >
          {privacyStatus.message}
        </StatusCallout>
      ) : null}

      <div>
        <label
          htmlFor="settings-preview-mode"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Notification preview mode
        </label>
        <select
          id="settings-preview-mode"
          value={privacy.notificationPreviewMode}
          onChange={(event) =>
            setPrivacy((current) => ({
              ...current,
              notificationPreviewMode: event.target.value as
                | "discreet"
                | "expanded"
                | "none",
            }))
          }
          className="input"
          disabled={controlsDisabled}
        >
          <option value="discreet">Discreet</option>
          <option value="expanded">Expanded</option>
          <option value="none">No previews</option>
        </select>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Keep lock-screen and banner previews minimal by default.
        </p>
      </div>

      {privacyToggleFields.map(({ key, label, description }) => {
        const labelId = `privacy-${key}-label`;
        const descriptionId = `privacy-${key}-description`;

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-4 py-2"
          >
            <div className="min-w-0">
              <p
                id={labelId}
                className="text-sm font-medium text-[var(--text-primary)]"
              >
                {label}
              </p>
              <p
                id={descriptionId}
                className="text-xs text-[var(--text-secondary)]"
              >
                {description}
              </p>
            </div>

            <Switch
              checked={privacy[key]}
              onChange={
                controlsDisabled
                  ? undefined
                  : (checked) =>
                      setPrivacy((current) => ({
                        ...current,
                        [key]: checked,
                      }))
              }
              style={
                controlsDisabled
                  ? { opacity: 0.6, pointerEvents: "none" }
                  : undefined
              }
            />
          </div>
        );
      })}

      <button
        type="submit"
        className="btn-primary"
        disabled={controlsDisabled}
      >
        {isSavingPrivacy ? "Saving Privacy…" : "Save Privacy Settings"}
      </button>
    </form>
  );
}
