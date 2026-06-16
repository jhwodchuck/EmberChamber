import { useEffect } from "react";
import {
  createDeviceLinkToken,
  encodeDeviceLinkQrPayload,
  parseDeviceLinkQrPayload,
  relayOriginsMatch,
  type DeviceLinkQrMode,
  type DeviceLinkStartResponse,
  type DeviceLinkStatus,
} from "@emberchamber/protocol";
import type { AuthSession, FormMessage } from "../../types";
import { STORAGE_KEYS, relayUrl } from "../../constants";
import { suggestMobileDeviceLabel } from "../../lib/utils";
import {
  claimDeviceLinkRequest,
  completeDeviceLinkRequest,
  fetchDeviceLinkStatusRequest,
} from "../../lib/deviceLinkApi";
import { getRelayOrigin as getMobileRelayOrigin } from "../../lib/relayClient";
import { secureStorageCapability } from "../../lib/nativeCapabilities";

export type ActiveDeviceLink = {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
};

interface UseDeviceLinkProps {
  session: AuthSession | null;
  sessionRef: React.MutableRefObject<AuthSession | null>;
  deviceLabel: string;
  onCompleteDeviceLink: (nextSession: AuthSession, source: "device-link") => Promise<void>;
  relayFetch: <T>(currentSession: AuthSession, path: string, init?: RequestInit, allowRefresh?: boolean) => Promise<T>;
  
  deviceLinkQrValue: string | null;
  setDeviceLinkQrValue: React.Dispatch<React.SetStateAction<string | null>>;
  deviceLinkStatus: DeviceLinkStatus | null;
  setDeviceLinkStatus: React.Dispatch<React.SetStateAction<DeviceLinkStatus | null>>;
  deviceLinkMessage: FormMessage | null;
  setDeviceLinkMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  isWorkingDeviceLink: boolean;
  setIsWorkingDeviceLink: React.Dispatch<React.SetStateAction<boolean>>;
  isApprovingDeviceLink: boolean;
  setIsApprovingDeviceLink: React.Dispatch<React.SetStateAction<boolean>>;
  activeDeviceLink: ActiveDeviceLink | null;
  setActiveDeviceLink: React.Dispatch<React.SetStateAction<ActiveDeviceLink | null>>;
  completedDeviceLinkSessionId: string | null;
  setCompletedDeviceLinkSessionId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useDeviceLink({
  sessionRef,
  deviceLabel,
  onCompleteDeviceLink,
  relayFetch,
  deviceLinkQrValue,
  setDeviceLinkQrValue,
  deviceLinkStatus,
  setDeviceLinkStatus,
  deviceLinkMessage,
  setDeviceLinkMessage,
  isWorkingDeviceLink,
  setIsWorkingDeviceLink,
  isApprovingDeviceLink,
  setIsApprovingDeviceLink,
  activeDeviceLink,
  setActiveDeviceLink,
  completedDeviceLinkSessionId,
  setCompletedDeviceLinkSessionId,
}: UseDeviceLinkProps) {
  function resetDeviceLinkState() {
    setDeviceLinkQrValue(null);
    setDeviceLinkStatus(null);
    setDeviceLinkMessage(null);
    setIsWorkingDeviceLink(false);
    setIsApprovingDeviceLink(false);
    setActiveDeviceLink(null);
    setCompletedDeviceLinkSessionId(null);
  }

  function normalizeStartedSourceDeviceLink(
    response: DeviceLinkStartResponse,
    requesterLabel: string,
  ): {
    legacy: boolean;
    qrPayload: string;
    parsed: ReturnType<typeof parseDeviceLinkQrPayload>;
    status: DeviceLinkStatus;
  } {
    try {
      return {
        legacy: false,
        qrPayload: response.qrPayload,
        parsed: parseDeviceLinkQrPayload(response.qrPayload),
        status: response,
      };
    } catch {
      if (!response.linkId || !response.qrPayload?.trim()) {
        throw new Error("The relay returned an unreadable device-link QR payload.");
      }

      const qrPayload = encodeDeviceLinkQrPayload({
        relayOrigin: getMobileRelayOrigin(relayUrl),
        qrMode: "source_display",
        linkToken: response.qrPayload.trim(),
        requesterLabel,
      });

      return {
        legacy: true,
        qrPayload,
        parsed: parseDeviceLinkQrPayload(qrPayload),
        status: {
          linkId: response.linkId,
          relayOrigin: getMobileRelayOrigin(relayUrl),
          qrMode: "source_display",
          state: "pending_claim",
          requesterLabel,
          expiresAt: response.expiresAt,
          canComplete: false,
        },
      };
    }
  }

  async function beginSourceDeviceLink() {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return;
    }

    setIsWorkingDeviceLink(true);
    setDeviceLinkMessage(null);
    setCompletedDeviceLinkSessionId(null);

    try {
      const normalizedDeviceLabel = deviceLabel.trim() || suggestMobileDeviceLabel();
      const response = await relayFetch<DeviceLinkStartResponse>(
        currentSession,
        "/v1/devices/link/start",
        {
          method: "POST",
          body: JSON.stringify({ deviceLabel: normalizedDeviceLabel }),
        },
      );
      const normalized = normalizeStartedSourceDeviceLink(response, normalizedDeviceLabel);

      setActiveDeviceLink(
        normalized.legacy
          ? null
          : {
              linkToken: normalized.parsed.linkToken,
              qrMode: normalized.parsed.qrMode,
            },
      );
      setDeviceLinkQrValue(normalized.qrPayload);
      setDeviceLinkStatus(normalized.status);
      if (normalized.legacy) {
        setDeviceLinkMessage({
          tone: "warning",
          title: "Relay rollout still pending",
          body: "This QR is displayed using the older relay contract. Completing the full device-link handoff still requires the relay update.",
        });
      }
    } catch (error) {
      setDeviceLinkMessage({
        tone: "error",
        title: "Unable to prepare device link",
        body: error instanceof Error ? error.message : "Unknown relay error",
      });
    } finally {
      setIsWorkingDeviceLink(false);
    }
  }

  async function beginTargetDeviceLink() {
    if (deviceLabel.trim().length < 3) {
      setDeviceLinkMessage({
        tone: "warning",
        title: "Name this phone first",
        body: "Use at least 3 characters so the signed-in device can recognize the approval target.",
      });
      return;
    }

    setIsWorkingDeviceLink(true);
    setDeviceLinkMessage(null);
    setCompletedDeviceLinkSessionId(null);

    try {
      const normalizedDeviceLabel = deviceLabel.trim();
      const linkToken = createDeviceLinkToken();
      const qrPayload = encodeDeviceLinkQrPayload({
        relayOrigin: getMobileRelayOrigin(relayUrl),
        qrMode: "target_display",
        linkToken,
        requesterLabel: normalizedDeviceLabel,
      });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await secureStorageCapability.setItem(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel);

      setActiveDeviceLink({ linkToken, qrMode: "target_display" });
      setDeviceLinkQrValue(qrPayload);
      setDeviceLinkStatus({
        relayOrigin: getMobileRelayOrigin(relayUrl),
        qrMode: "target_display",
        state: "waiting_for_source",
        requesterLabel: normalizedDeviceLabel,
        expiresAt,
        canComplete: false,
      });
    } catch (error) {
      setDeviceLinkMessage({
        tone: "error",
        title: "Unable to prepare device link",
        body: error instanceof Error ? error.message : "Unknown relay error",
      });
    } finally {
      setIsWorkingDeviceLink(false);
    }
  }

  async function scanDeviceLinkQr(qrPayload: string) {
    setIsWorkingDeviceLink(true);
    setDeviceLinkMessage(null);
    setCompletedDeviceLinkSessionId(null);

    try {
      const parsed = parseDeviceLinkQrPayload(qrPayload);
      if (!relayOriginsMatch(getMobileRelayOrigin(relayUrl), parsed.relayOrigin)) {
        throw new Error("That QR belongs to a different relay environment.");
      }

      if (sessionRef.current) {
        if (parsed.qrMode !== "target_display") {
          throw new Error("That QR is meant for a new device, not a signed-in device.");
        }

        const response = await relayFetch<DeviceLinkStatus>(
          sessionRef.current,
          "/v1/devices/link/scan",
          {
            method: "POST",
            body: JSON.stringify({ qrPayload }),
          },
        );

        setActiveDeviceLink({
          linkToken: parsed.linkToken,
          qrMode: parsed.qrMode,
        });
        setDeviceLinkQrValue(null);
        setDeviceLinkStatus(response);
        return;
      }

      if (deviceLabel.trim().length < 3) {
        throw new Error("Name this phone before scanning so the approval request is readable.");
      }
      if (parsed.qrMode !== "source_display") {
        throw new Error("That QR is meant to be scanned by a signed-in device.");
      }

      const normalizedDeviceLabel = deviceLabel.trim();
      await secureStorageCapability.setItem(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel);

      const { response, body } = await claimDeviceLinkRequest({
        qrPayload,
        deviceLabel: normalizedDeviceLabel,
      });
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to claim this device-link request.");
      }

      setActiveDeviceLink({
        linkToken: parsed.linkToken,
        qrMode: parsed.qrMode,
      });
      setDeviceLinkQrValue(null);
      setDeviceLinkStatus(body);
    } catch (error) {
      setDeviceLinkMessage({
        tone: "error",
        title: "QR scan failed",
        body: error instanceof Error ? error.message : "Unknown scan error",
      });
    } finally {
      setIsWorkingDeviceLink(false);
    }
  }

  async function approveDeviceLink() {
    const currentSession = sessionRef.current;
    if (!currentSession || !deviceLinkStatus?.linkId) {
      return;
    }

    setIsApprovingDeviceLink(true);
    setDeviceLinkMessage(null);

    try {
      const response = await relayFetch<DeviceLinkStatus>(
        currentSession,
        "/v1/devices/link/confirm",
        {
          method: "POST",
          body: JSON.stringify({ linkId: deviceLinkStatus.linkId }),
        },
      );
      setDeviceLinkStatus(response);
      setDeviceLinkMessage({
        tone: "success",
        title: "Device approved",
        body: `${response.requesterLabel} can finish sign-in now.`,
      });
    } catch (error) {
      setDeviceLinkMessage({
        tone: "error",
        title: "Approval failed",
        body: error instanceof Error ? error.message : "Unknown relay error",
      });
    } finally {
      setIsApprovingDeviceLink(false);
    }
  }

  async function completeDeviceLink(linkToken: string, qrMode: DeviceLinkQrMode) {
    const { response, body } = await completeDeviceLinkRequest({
      linkToken,
      qrMode,
    });
    if (!response.ok || !("accessToken" in body)) {
      throw new Error(body.error ?? "Unable to complete device linking.");
    }

    await onCompleteDeviceLink(body, "device-link");
  }

  useEffect(() => {
    if (!activeDeviceLink || completedDeviceLinkSessionId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const { response, body } = await fetchDeviceLinkStatusRequest({
          linkToken: activeDeviceLink.linkToken,
          qrMode: activeDeviceLink.qrMode,
        });
        if (!response.ok) {
          const awaitingSourceScan =
            !sessionRef.current &&
            activeDeviceLink.qrMode === "target_display" &&
            body.code === "DEVICE_LINK_NOT_FOUND";
          if (!awaitingSourceScan) {
            throw new Error(body.error ?? "Unable to refresh device-link status.");
          }
        } else {
          if (cancelled) {
            return;
          }

          setDeviceLinkStatus(body);

          if (!sessionRef.current && body.state === "approved") {
            await completeDeviceLink(activeDeviceLink.linkToken, activeDeviceLink.qrMode);
            return;
          }

          if (body.state === "consumed" || body.state === "expired") {
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDeviceLinkMessage({
            tone: "error",
            title: "Device-link status failed",
            body: error instanceof Error ? error.message : "Unknown relay error",
          });
        }
      }

      if (!cancelled) {
        timer = setTimeout(() => {
          void poll();
        }, 2000);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeDeviceLink, completedDeviceLinkSessionId, sessionRef]);

  return {
    resetDeviceLinkState,
    beginSourceDeviceLink,
    beginTargetDeviceLink,
    scanDeviceLinkQr,
    approveDeviceLink,
  };
}
