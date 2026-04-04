"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  createDeviceLinkToken,
  encodeDeviceLinkQrPayload,
  parseDeviceLinkQrPayload,
  relayOriginsMatch,
  type DeviceLinkQrMode,
  type DeviceLinkStatus,
} from "@emberchamber/protocol";
import { StatusCallout } from "@/components/status-callout";
import {
  getRelayOrigin,
  relayDeviceLinkApi,
} from "@/lib/relay";
import { useAuthStore } from "@/lib/store";

type DeviceLinkPanelProps = {
  signedIn: boolean;
  deviceLabel?: string;
  className?: string;
};

type ActiveLink = {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
  qrPayload?: string;
  requesterLabel?: string;
  localExpiresAt?: string;
};

function describeStatus(status: DeviceLinkStatus | null, signedIn: boolean) {
  if (!status) {
    return signedIn
      ? "Start a short-lived QR request from this signed-in device, or scan a waiting QR from the new device."
      : "Use your device label, then either show a QR for a trusted device to approve or scan a trusted device QR here.";
  }

  switch (status.state) {
    case "waiting_for_source":
      return "Waiting for a signed-in device to scan this QR and attach it to your account.";
    case "pending_claim":
      return "Waiting for the new device to scan this QR and announce its device label.";
    case "pending_approval":
      return signedIn
        ? `${status.requesterLabel} is ready. Approve it on this device to issue a new session.`
        : `${status.requesterLabel} is waiting for approval from your signed-in device.`;
    case "approved":
      return signedIn
        ? `${status.requesterLabel} has been approved. The new device can finish sign-in now.`
        : `${status.requesterLabel} was approved. Finishing sign-in on this browser now.`;
    case "consumed":
      return `${status.requesterLabel} already finished sign-in with this QR.`;
    case "expired":
      return "This QR expired. Start a fresh device-link request.";
    default:
      return "Device-link status is updating.";
  }
}

function formatExpiry(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString();
}

export function DeviceLinkPanel({ signedIn, deviceLabel = "", className }: DeviceLinkPanelProps) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);
  const [status, setStatus] = useState<DeviceLinkStatus | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warning" | "info"; title: string; body: string } | null>(null);
  const [completedToken, setCompletedToken] = useState<string | null>(null);
  const [scanExpectation, setScanExpectation] = useState<DeviceLinkQrMode>("source_display");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function reset() {
    setActiveLink(null);
    setStatus(null);
    setQrImageUrl("");
    setIsScannerOpen(false);
    setIsWorking(false);
    setIsApproving(false);
    setMessage(null);
    setCompletedToken(null);
  }

  async function beginShowQr() {
    if (!signedIn && deviceLabel.trim().length < 3) {
      setMessage({
        tone: "warning",
        title: "Name this device first",
        body: "Use at least 3 characters so the signed-in device sees a readable label before approving it.",
      });
      return;
    }

    setIsWorking(true);
    setMessage(null);
    setIsScannerOpen(false);
    setQrImageUrl("");

    try {
      if (signedIn) {
        const response = await relayDeviceLinkApi.start();
        setActiveLink({
          linkToken: parseDeviceLinkQrPayload(response.qrPayload).linkToken,
          qrMode: response.qrMode,
          qrPayload: response.qrPayload,
          requesterLabel: response.requesterLabel,
          localExpiresAt: response.expiresAt,
        });
        setStatus(response);
        setQrImageUrl(await QRCode.toDataURL(response.qrPayload, { margin: 1, width: 260 }));
      } else {
        const linkToken = createDeviceLinkToken();
        const qrPayload = encodeDeviceLinkQrPayload({
          relayOrigin: getRelayOrigin(),
          qrMode: "target_display",
          linkToken,
          requesterLabel: deviceLabel.trim(),
        });
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        setActiveLink({
          linkToken,
          qrMode: "target_display",
          qrPayload,
          requesterLabel: deviceLabel.trim(),
          localExpiresAt: expiresAt,
        });
        setStatus({
          relayOrigin: getRelayOrigin(),
          qrMode: "target_display",
          state: "waiting_for_source",
          requesterLabel: deviceLabel.trim(),
          expiresAt,
          canComplete: false,
        });
        setQrImageUrl(await QRCode.toDataURL(qrPayload, { margin: 1, width: 260 }));
      }
    } catch (error) {
      setMessage({
        tone: "error",
        title: "Unable to prepare device link",
        body: error instanceof Error ? error.message : "Unknown QR setup error",
      });
    } finally {
      setIsWorking(false);
    }
  }

  function beginScanner(mode: DeviceLinkQrMode) {
    if (!signedIn && deviceLabel.trim().length < 3) {
      setMessage({
        tone: "warning",
        title: "Name this device first",
        body: "Use at least 3 characters so the trusted device sees a readable label before approving it.",
      });
      return;
    }

    setScanExpectation(mode);
    setMessage(null);
    setQrImageUrl("");
    setIsScannerOpen(true);
  }

  useEffect(() => {
    if (!isScannerOpen || !videoRef.current) {
      return;
    }

    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    void (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) {
          return;
        }

        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          videoRef.current,
          async (result) => {
            const text = result?.getText();
            if (!text || cancelled) {
              return;
            }

            controls?.stop();
            setIsScannerOpen(false);
            setIsWorking(true);

            try {
              const parsed = parseDeviceLinkQrPayload(text);
              if (parsed.qrMode !== scanExpectation) {
                throw new Error("That QR is for the opposite device-link flow.");
              }
              if (!relayOriginsMatch(getRelayOrigin(), parsed.relayOrigin)) {
                throw new Error("That QR belongs to a different relay environment.");
              }

              if (signedIn) {
                const response = await relayDeviceLinkApi.scan({ qrPayload: text });
                setActiveLink({
                  linkToken: parsed.linkToken,
                  qrMode: parsed.qrMode,
                  requesterLabel: response.requesterLabel,
                  localExpiresAt: response.expiresAt,
                });
                setStatus(response);
              } else {
                const response = await relayDeviceLinkApi.claim(text, deviceLabel.trim());
                setActiveLink({
                  linkToken: parsed.linkToken,
                  qrMode: parsed.qrMode,
                  requesterLabel: deviceLabel.trim(),
                  localExpiresAt: response.expiresAt,
                });
                setStatus(response);
              }
            } catch (error) {
              setMessage({
                tone: "error",
                title: "QR scan failed",
                body: error instanceof Error ? error.message : "Unknown QR scan error",
              });
            } finally {
              setIsWorking(false);
            }
          },
        );
      } catch (error) {
        setIsScannerOpen(false);
        setMessage({
          tone: "error",
          title: "Camera scan unavailable",
          body:
            error instanceof Error
              ? error.message
              : "The browser could not open a camera for QR scanning.",
        });
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [deviceLabel, isScannerOpen, scanExpectation, signedIn]);

  useEffect(() => {
    if (!activeLink || completedToken) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const nextStatus = await relayDeviceLinkApi.status({
          linkToken: activeLink.linkToken,
          qrMode: activeLink.qrMode,
        });
        if (cancelled) {
          return;
        }

        setStatus(nextStatus);

        if (!signedIn && nextStatus.state === "approved") {
          const session = await relayDeviceLinkApi.complete({
            linkToken: activeLink.linkToken,
            qrMode: activeLink.qrMode,
          });
          if (!cancelled) {
            setSession(session);
            setCompletedToken(session.sessionId);
            setMessage({
              tone: "success",
              title: "Session ready",
              body: "This browser now has a relay session from the trusted-device handoff.",
            });
            router.replace("/app");
          }
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            tone: "error",
            title: "Device-link status failed",
            body: error instanceof Error ? error.message : "Unable to refresh QR status.",
          });
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(poll, 2000);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeLink, completedToken, router, setSession, signedIn]);

  async function approveLink() {
    if (!status?.linkId) {
      return;
    }

    setIsApproving(true);
    setMessage(null);
    try {
      const nextStatus = await relayDeviceLinkApi.confirm(status.linkId);
      setStatus(nextStatus);
      setMessage({
        tone: "success",
        title: "Device approved",
        body: `${nextStatus.requesterLabel} can finish sign-in now.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        title: "Approval failed",
        body: error instanceof Error ? error.message : "Unknown approval error",
      });
    } finally {
      setIsApproving(false);
    }
  }

  const expiry = formatExpiry(status?.expiresAt ?? activeLink?.localExpiresAt);
  const description = describeStatus(status, signedIn);

  return (
    <div className={className}>
      <div className="card border-brand-500/20 bg-brand-500/5">
        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          {signedIn ? "Link another device" : "Link with another device"}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void beginShowQr()} className="btn-primary" disabled={isWorking}>
          {isWorking ? "Preparing…" : signedIn ? "Show my QR" : "Show QR"}
        </button>
        <button
          type="button"
          onClick={() => beginScanner(signedIn ? "target_display" : "source_display")}
          className="btn-ghost"
          disabled={isWorking}
        >
          {signedIn ? "Scan new device QR" : "Scan trusted device QR"}
        </button>
        {(activeLink || status || message) && (
          <button type="button" onClick={reset} className="btn-ghost">
            Clear
          </button>
        )}
      </div>

      {message ? (
        <div className="mt-4">
          <StatusCallout tone={message.tone} title={message.title}>
            {message.body}
          </StatusCallout>
        </div>
      ) : null}

      {isScannerOpen ? (
        <div className="mt-4 card">
          <p className="text-sm font-medium text-[var(--text-primary)]">Scan a QR code</p>
          <video ref={videoRef} className="mt-3 aspect-square w-full rounded-[1.2rem] bg-black/70" muted playsInline />
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            Camera permission is required while this scanner is open.
          </p>
        </div>
      ) : null}

      {qrImageUrl ? (
        <div className="mt-4 card flex items-center justify-center">
          <Image
            src={qrImageUrl}
            alt="Device-link QR code"
            className="h-[260px] w-[260px] rounded-[1.4rem] bg-white p-3"
            width={260}
            height={260}
            unoptimized
          />
        </div>
      ) : null}

      {status || activeLink ? (
        <div className="mt-4">
          <StatusCallout
            tone={status?.state === "expired" ? "warning" : status?.state === "consumed" ? "success" : "info"}
            title={signedIn ? "Device-link status" : "Waiting for trusted-device approval"}
            action={
              signedIn && status?.state === "pending_approval" && status.linkId ? (
                <button type="button" onClick={() => void approveLink()} className="btn-primary" disabled={isApproving}>
                  {isApproving ? "Approving…" : "Approve"}
                </button>
              ) : undefined
            }
          >
            {description}
            {expiry ? <div className="mt-1 text-xs">Expires {expiry}</div> : null}
            {(status?.requesterLabel ?? activeLink?.requesterLabel) ? (
              <div className="mt-1 text-xs">
                Device: <span className="font-medium">{status?.requesterLabel ?? activeLink?.requesterLabel}</span>
              </div>
            ) : null}
          </StatusCallout>
        </div>
      ) : null}
    </div>
  );
}
