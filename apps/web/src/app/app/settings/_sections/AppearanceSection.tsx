"use client";

import { useEffect, useState } from "react";
import { Switch } from "@emberchamber/ui/components";
import { StatusCallout } from "@/components/status-callout";
import { relayAccountApi } from "@/lib/relay";
import {
  createPushSubscription,
  getPushState,
  isPushSupported,
  registerServiceWorker,
  removePushSubscription,
  type PushState,
} from "@/lib/push";

interface AppearanceSectionProps {
  oledEnabled: boolean;
  setOledEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AppearanceSection({
  oledEnabled,
  setOledEnabled,
}: AppearanceSectionProps) {
  const [pushState, setPushState] = useState<PushState>("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    void getPushState().then(setPushState);
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const { publicKey } = await relayAccountApi.getVapidPublicKey();
      const sub = await createPushSubscription(publicKey);
      if (!sub) {
        setPushError(
          Notification.permission === "denied"
            ? "Notification permission was denied. Allow it in your browser settings and try again."
            : "Push subscription failed. Try again or check browser push support.",
        );
        setPushState(
          Notification.permission === "denied" ? "denied" : "unsubscribed",
        );
        return;
      }
      await relayAccountApi.subscribeWebPush(sub);
      setPushState("subscribed");
    } catch {
      setPushError("Could not enable push notifications. Try again later.");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      await removePushSubscription();
      await relayAccountApi.unsubscribeWebPush();
      setPushState("unsubscribed");
    } catch {
      setPushError("Could not disable push notifications. Try again later.");
    } finally {
      setPushBusy(false);
    }
  }

  const pushSupported = isPushSupported();

  return (
    <div
      id="settings-panel-appearance"
      role="tabpanel"
      aria-labelledby="settings-tab-appearance"
      className="space-y-4"
    >
      <StatusCallout tone="info" title="Browser-only settings">
        These controls only affect the current web browser session.
      </StatusCallout>

      <div>
        <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
          Theme
        </p>
        <div className="flex gap-3">
          {(["light", "dark", "system"] as const).map((themeOption) => (
            <button
              key={themeOption}
              type="button"
              onClick={() => {
                const prefersDark = window.matchMedia(
                  "(prefers-color-scheme: dark)",
                ).matches;
                const resolvedTheme =
                  themeOption === "system"
                    ? prefersDark
                      ? "dark"
                      : "light"
                    : themeOption;

                // OLED is a dark sub-mode; picking a non-dark theme turns it
                // off so the surfaces stay coherent.
                if (resolvedTheme !== "dark" && oledEnabled) {
                  setOledEnabled(false);
                  localStorage.setItem("oled", "false");
                  document.documentElement.classList.remove("oled");
                }

                document.documentElement.classList.toggle(
                  "dark",
                  resolvedTheme === "dark",
                );
                localStorage.setItem("theme", themeOption);
              }}
              className="card flex-1 cursor-pointer py-3 text-center capitalize transition-colors hover:border-brand-500"
            >
              {themeOption === "light"
                ? "Light"
                : themeOption === "dark"
                  ? "Dark"
                  : "System"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            OLED true black
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Use a pure-black background on dark themes so unlit pixels stay
            off on OLED displays.
          </p>
        </div>
        <Switch
          checked={oledEnabled}
          onChange={(checked) => {
            setOledEnabled(checked);
            localStorage.setItem("oled", checked ? "true" : "false");
            document.documentElement.classList.toggle("oled", checked);
            if (checked) {
              document.documentElement.classList.add("dark");
              localStorage.setItem("theme", "dark");
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Push notifications
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {!pushSupported
              ? "Not supported in this browser."
              : pushState === "denied"
                ? "Permission denied — allow notifications in browser settings."
                : "Get a badge when new messages arrive, even when the tab is in the background. No message content is included in the push signal."}
          </p>
        </div>
        <Switch
          checked={pushState === "subscribed"}
          onChange={pushState === "subscribed" ? handleDisablePush : handleEnablePush}
          style={
            !pushSupported || pushState === "denied" || pushState === "loading" || pushBusy
              ? { opacity: 0.5, pointerEvents: "none" }
              : undefined
          }
        />
      </div>

      {pushError ? (
        <StatusCallout tone="error" title="Push notification error">
          {pushError}
        </StatusCallout>
      ) : null}
    </div>
  );
}
