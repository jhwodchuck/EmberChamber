import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Notifications from "expo-notifications";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import * as SystemUI from "expo-system-ui";
import { startTransition, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { EncryptedConversationPayload } from "@emberchamber/protocol";
import {
  createDeviceLinkToken,
  decryptConversationPayload,
  encodeDeviceLinkQrPayload,
  encryptAttachmentBytes,
  encryptConversationPayload,
  parseDeviceLinkQrPayload,
  relayOriginsMatch,
  toPublicPrekeyBundle,
  type DeviceLinkQrMode,
  type DeviceLinkStartResponse,
  type DeviceLinkStatus,
} from "@emberchamber/protocol";

import type {
  AttachmentTicket,
  AuthSession,
  ContactCard,
  DeviceKeyBundle,
  Field,
  FormMessage,
  GroupInviteAcceptance,
  GroupInvitePreview,
  GroupMembershipSummary,
  GroupThreadMessage,
  MagicLinkResponse,
  MeProfile,
  PendingAttachment,
  PrivacyDefaults,
  RelayErrorResponse,
} from "./src/types";
import {
  MAX_ATTACHMENT_BYTES,
  STORAGE_KEYS,
  defaultPrivacyDefaults,
  onboardingAssurances,
  relayUrl,
} from "./src/constants";
import {
  createDeviceBundleScaffold,
  extractCompletionTokenFromUrl,
  isDefaultDisplayName,
  isValidEmail,
  makeOpaqueToken,
  normalizeInviteReference,
  suggestMobileDeviceLabel,
} from "./src/lib/utils";
import {
  bootstrapLocalStore,
  countVaultItems,
  loadCachedGroupMessages,
  loadCachedGroups,
  loadRelayStateValue,
  loadPrivacyDefaults,
  persistVaultMediaRecord,
  saveRelayStateValue,
  savePrivacyDefault,
  saveCachedGroupMessages,
  saveCachedGroups,
} from "./src/lib/db";
import {
  clearStoredSession,
  loadStoredDeviceBundle,
  loadStoredSession,
  saveStoredDeviceBundle,
  saveStoredSession,
} from "./src/lib/session";
import {
  ensurePushRuntimeConfiguredAsync,
  getNativeDevicePushRegistrationAsync,
  getNotificationConversationId,
  getNotificationReason,
} from "./src/lib/push";
import { styles, theme } from "./src/styles";
import { DeviceLinkCard } from "./src/components/DeviceLinkCard";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { MainScreen } from "./src/screens/MainScreen";

const onboardingHeroSignals = [
  "Invite-only onboarding",
  "Adults-only access",
  "Local-first history",
];

const signedInHeroSignals = [
  "Trusted-circle messaging",
  "On-device vault defaults",
  "Relay-native group sync",
];

const MAILBOX_CURSOR_STATE_KEY = "mailbox_cursor";

type AuthMethod = "magic-link" | "device-link";

type ActiveDeviceLink = {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
};

// ---------------------------------------------------------------------------
// App – thin orchestrator
// ---------------------------------------------------------------------------

export default function App() {
  // ---- state ----
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [deviceLabel, setDeviceLabel] = useState(suggestMobileDeviceLabel());
  const [ageConfirmed18, setAgeConfirmed18] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magic-link");
  const [inviteInput, setInviteInput] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isPreviewingInvite, setIsPreviewingInvite] = useState(false);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [challenge, setChallenge] = useState<MagicLinkResponse | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [contactCard, setContactCard] = useState<ContactCard | null>(null);
  const [groups, setGroups] = useState<GroupMembershipSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<GroupThreadMessage[]>([]);
  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(null);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [inviteFieldVisible, setInviteFieldVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [sessionMessage, setSessionMessage] = useState<FormMessage | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [deviceBundleCount, setDeviceBundleCount] = useState(0);
  const [deviceBundleReady, setDeviceBundleReady] = useState(false);
  const [deviceBundleError, setDeviceBundleError] = useState<string | null>(null);
  const [privacyDefaults, setPrivacyDefaults] = useState<PrivacyDefaults>(defaultPrivacyDefaults);
  const [profileSetupActive, setProfileSetupActive] = useState(false);
  const [profileSetupName, setProfileSetupName] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState<string | null>(null);
  const [deviceLinkQrValue, setDeviceLinkQrValue] = useState<string | null>(null);
  const [deviceLinkStatus, setDeviceLinkStatus] = useState<DeviceLinkStatus | null>(null);
  const [deviceLinkMessage, setDeviceLinkMessage] = useState<FormMessage | null>(null);
  const [isWorkingDeviceLink, setIsWorkingDeviceLink] = useState(false);
  const [isApprovingDeviceLink, setIsApprovingDeviceLink] = useState(false);
  const [activeDeviceLink, setActiveDeviceLink] = useState<ActiveDeviceLink | null>(null);
  const [completedDeviceLinkSessionId, setCompletedDeviceLinkSessionId] = useState<string | null>(null);

  const imageRefreshPendingRef = useRef(false);
  const groupsRef = useRef<GroupMembershipSummary[]>([]);
  const sessionRef = useRef<AuthSession | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const deviceBundleDirectoryRef = useRef(new Map<string, DeviceKeyBundle[]>());

  const selectedGroup =
    groups.find((group) => group.id === selectedConversationId) ??
    (session?.bootstrapConversationId
      ? groups.find((group) => group.id === session.bootstrapConversationId) ?? null
      : null);

  // ---- relay helpers (stay here because they close over setSession) ----

  async function fetchJson<T>(
    url: string,
    init?: RequestInit,
    timeoutMs = 15_000,
  ): Promise<{ response: Response; body: T & RelayErrorResponse }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const rawBody = await response.text();
      let body = {} as T & RelayErrorResponse;

      if (rawBody) {
        try {
          body = JSON.parse(rawBody) as T & RelayErrorResponse;
        } catch {
          body = { error: rawBody } as T & RelayErrorResponse;
        }
      }

      return { response, body };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("The relay took too long to respond. Check your connection and try again.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function relayFetch<T>(
    currentSession: AuthSession,
    path: string,
    init?: RequestInit,
    allowRefresh = true,
  ): Promise<T> {
    const headers = {
      authorization: `Bearer ${currentSession.accessToken}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    };

    const { response, body } = await fetchJson<T>(`${relayUrl}${path}`, {
      ...init,
      headers,
    });
    if (response.ok) {
      return body;
    }

    if (response.status === 401 && allowRefresh) {
      const refreshed = await refreshRelaySession(currentSession);
      if (refreshed) {
        return relayFetch<T>(refreshed, path, init, false);
      }
    }

    throw new Error(body.error ?? `Relay request failed: ${response.status}`);
  }

  async function refreshRelaySession(currentSession: AuthSession) {
    const { response, body } = await fetchJson<{
      accessToken: string;
      deviceId: string;
      sessionId: string;
    }>(`${relayUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    });

    if (!response.ok || !("accessToken" in body)) {
      await clearStoredSession();
      setSession(null);
      return null;
    }

    const nextSession: AuthSession = {
      ...currentSession,
      accessToken: body.accessToken,
      deviceId: body.deviceId,
      sessionId: body.sessionId,
    };

    await saveStoredSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }

  function getRelayOrigin() {
    return new URL(relayUrl).origin;
  }

  function resetDeviceLinkState() {
    setDeviceLinkQrValue(null);
    setDeviceLinkStatus(null);
    setDeviceLinkMessage(null);
    setIsWorkingDeviceLink(false);
    setIsApprovingDeviceLink(false);
    setActiveDeviceLink(null);
    setCompletedDeviceLinkSessionId(null);
  }

  function buildSessionReadyMessage(nextSession: AuthSession, source: "magic-link" | "device-link"): FormMessage {
    if (nextSession.bootstrapConversationTitle) {
      return {
        tone: "success",
        title: source === "device-link" ? "Device linked and thread ready" : "Signed in and thread ready",
        body: `${nextSession.bootstrapConversationTitle} should appear below as soon as account sync finishes.`,
      };
    }

    return {
      tone: "success",
      title: source === "device-link" ? "Device linked" : "Session ready",
      body:
        source === "device-link"
          ? "This phone now has a relay session from the trusted-device approval flow."
          : "This phone now has a relay session. Join or create a trusted circle to send your first message.",
    };
  }

  async function persistAuthenticatedSession(nextSession: AuthSession, source: "magic-link" | "device-link") {
    const normalizedDeviceLabel = deviceLabel.trim() || suggestMobileDeviceLabel();

    await Promise.all([
      saveStoredSession(nextSession),
      SecureStore.setItemAsync(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel),
    ]);

    setSession(nextSession);
    setChallenge(null);
    setCompletedDeviceLinkSessionId(nextSession.sessionId);
    setDeviceLinkQrValue(null);
    setDeviceLinkStatus(null);
    setDeviceLinkMessage(null);
    setActiveDeviceLink(null);
    setSessionMessage(buildSessionReadyMessage(nextSession, source));
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
      const response = await relayFetch<DeviceLinkStartResponse>(currentSession, "/v1/devices/link/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const parsed = parseDeviceLinkQrPayload(response.qrPayload);

      setActiveDeviceLink({ linkToken: parsed.linkToken, qrMode: parsed.qrMode });
      setDeviceLinkQrValue(response.qrPayload);
      setDeviceLinkStatus(response);
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
        relayOrigin: getRelayOrigin(),
        qrMode: "target_display",
        linkToken,
        requesterLabel: normalizedDeviceLabel,
      });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await SecureStore.setItemAsync(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel);

      setActiveDeviceLink({ linkToken, qrMode: "target_display" });
      setDeviceLinkQrValue(qrPayload);
      setDeviceLinkStatus({
        relayOrigin: getRelayOrigin(),
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
      if (!relayOriginsMatch(getRelayOrigin(), parsed.relayOrigin)) {
        throw new Error("That QR belongs to a different relay environment.");
      }

      if (sessionRef.current) {
        if (parsed.qrMode !== "target_display") {
          throw new Error("That QR is meant for a new device, not a signed-in device.");
        }

        const response = await relayFetch<DeviceLinkStatus>(sessionRef.current, "/v1/devices/link/scan", {
          method: "POST",
          body: JSON.stringify({ qrPayload }),
        });

        setActiveDeviceLink({ linkToken: parsed.linkToken, qrMode: parsed.qrMode });
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
      await SecureStore.setItemAsync(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel);

      const { response, body } = await fetchJson<DeviceLinkStatus>(`${relayUrl}/v1/devices/link/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qrPayload, deviceLabel: normalizedDeviceLabel }),
      });
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to claim this device-link request.");
      }

      setActiveDeviceLink({ linkToken: parsed.linkToken, qrMode: parsed.qrMode });
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
      const response = await relayFetch<DeviceLinkStatus>(currentSession, "/v1/devices/link/confirm", {
        method: "POST",
        body: JSON.stringify({ linkId: deviceLinkStatus.linkId }),
      });
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
    const { response, body } = await fetchJson<AuthSession>(`${relayUrl}/v1/devices/link/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkToken, qrMode }),
    });
    if (!response.ok || !("accessToken" in body)) {
      throw new Error(body.error ?? "Unable to complete device linking.");
    }

    await persistAuthenticatedSession(body, "device-link");
  }

  async function ensureDeviceBundleRegistered(currentSession: AuthSession) {
    const localBundle =
      (await loadStoredDeviceBundle(currentSession.deviceId)) ?? createDeviceBundleScaffold();
    await saveStoredDeviceBundle(currentSession.deviceId, localBundle);

    const existingBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );
    deviceBundleDirectoryRef.current.set(currentSession.accountId, existingBundles);

    if (existingBundles.some((bundle) => bundle.deviceId === currentSession.deviceId) && localBundle.privateKeyB64) {
      return existingBundles;
    }

    await relayFetch<{ registered: boolean }>(currentSession, "/v1/devices/register", {
      method: "POST",
      body: JSON.stringify(toPublicPrekeyBundle(localBundle)),
    });

    const confirmedBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );
    deviceBundleDirectoryRef.current.set(currentSession.accountId, confirmedBundles);

    if (!confirmedBundles.some((bundle) => bundle.deviceId === currentSession.deviceId)) {
      throw new Error("This phone's device identity did not register correctly.");
    }

    return confirmedBundles;
  }

  async function listDeviceBundlesForAccount(currentSession: AuthSession, accountId: string) {
    const cached = deviceBundleDirectoryRef.current.get(accountId);
    if (cached) {
      return cached;
    }

    const bundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${accountId}/device-bundles`,
    );
    deviceBundleDirectoryRef.current.set(accountId, bundles);
    return bundles;
  }

  async function loadStoredBundleOrThrow(currentSession: AuthSession) {
    const bundle = await loadStoredDeviceBundle(currentSession.deviceId);
    if (!bundle?.privateKeyB64) {
      throw new Error("This device is missing its private message key.");
    }

    return bundle as DeviceKeyBundle["bundle"] & { privateKeyB64: string };
  }

  async function syncEncryptedMailbox(currentSession: AuthSession) {
    if (!db) {
      return { receivedConversationIds: [] as string[] };
    }

    await ensureDeviceBundleRegistered(currentSession);
    const localBundle = await loadStoredBundleOrThrow(currentSession);
    const cursor = await loadRelayStateValue(db, MAILBOX_CURSOR_STATE_KEY);
    const sync = await relayFetch<{
      cursor: { lastSeenEnvelopeId?: string };
      envelopes: Array<{
        envelopeId: string;
        conversationId: string;
        senderAccountId: string;
        senderDeviceId: string;
        ciphertext: string;
      }>;
    }>(
      currentSession,
      `/v1/mailbox/sync?after=${encodeURIComponent(cursor ?? "")}&limit=${encodeURIComponent(String(100))}`,
    );

    const receivedConversationIds = new Set<string>();
    const updatedMessages = new Map<string, GroupThreadMessage[]>();
    const ackEnvelopeIds: string[] = [];

    for (const envelope of sync.envelopes) {
      try {
        const senderBundles = await listDeviceBundlesForAccount(currentSession, envelope.senderAccountId);
        const senderBundle = senderBundles.find((entry) => entry.deviceId === envelope.senderDeviceId);
        if (!senderBundle) {
          continue;
        }

        const payload = decryptConversationPayload<EncryptedConversationPayload>(
          envelope.ciphertext,
          senderBundle.bundle.identityKeyB64,
          localBundle.privateKeyB64,
        );

        if (payload.kind !== "ember_conversation_v1") {
          continue;
        }

        const conversationMessages =
          updatedMessages.get(envelope.conversationId) ??
          (await loadCachedGroupMessages(db, envelope.conversationId));
        const messageId = `${envelope.envelopeId}:${payload.clientMessageId}`;
        const nextMessage: GroupThreadMessage = {
          id: messageId,
          conversationId: envelope.conversationId,
          historyMode: "device_encrypted",
          senderAccountId: envelope.senderAccountId,
          senderDisplayName: payload.senderDisplayName,
          kind: payload.attachment ? "media" : "text",
          text: payload.text,
          attachment: payload.attachment
            ? {
                ...payload.attachment,
                downloadUrl: "",
              }
            : null,
          createdAt: payload.createdAt,
        };

        const mergedMessages = conversationMessages
          .filter((entry) => entry.id !== nextMessage.id)
          .concat(nextMessage)
          .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

        updatedMessages.set(envelope.conversationId, mergedMessages);
        receivedConversationIds.add(envelope.conversationId);
        ackEnvelopeIds.push(envelope.envelopeId);
      } catch {
        // Ignore envelopes that this device cannot open.
      }
    }

    await Promise.all(
      Array.from(updatedMessages.entries()).map(([conversationId, messages]) =>
        saveCachedGroupMessages(db, conversationId, messages),
      ),
    );

    if (sync.cursor.lastSeenEnvelopeId) {
      await saveRelayStateValue(db, MAILBOX_CURSOR_STATE_KEY, sync.cursor.lastSeenEnvelopeId);
    }

    if (ackEnvelopeIds.length > 0) {
      await relayFetch<{ acknowledged: number }>(currentSession, "/v1/mailbox/ack", {
        method: "POST",
        body: JSON.stringify({ envelopeIds: ackEnvelopeIds }),
      });
    }

    return {
      receivedConversationIds: Array.from(receivedConversationIds),
    };
  }

  async function refreshGroupThread(currentSession: AuthSession, conversationId: string) {
    const targetGroup = groupsRef.current.find((group) => group.id === conversationId);
    if (targetGroup?.historyMode === "device_encrypted") {
      if (!db) {
        setThreadMessages([]);
        return;
      }

      await syncEncryptedMailbox(currentSession);
      setThreadMessages(await loadCachedGroupMessages(db, conversationId));
      return;
    }

    const messages = await relayFetch<GroupThreadMessage[]>(
      currentSession,
      `/v1/groups/${conversationId}/messages?limit=100`,
    );
    setThreadMessages(messages);

    if (db) {
      await saveCachedGroupMessages(db, conversationId, messages);
    }
  }

  async function registerNativePushToken(currentSession: AuthSession) {
    await ensurePushRuntimeConfiguredAsync();
    const registration = await getNativeDevicePushRegistrationAsync();

    if (!registration) {
      try {
        await relayFetch<{ cleared: boolean }>(currentSession, "/v1/devices/push-token", {
          method: "DELETE",
        });
      } catch {
        // Ignore cleanup errors if push was never registered server-side.
      }
      return false;
    }

    await relayFetch<{ registered: boolean }>(currentSession, "/v1/devices/push-token", {
      method: "POST",
      body: JSON.stringify({
        ...registration,
        appId: Platform.OS === "android" ? "com.emberchamber.mobile" : "com.emberchamber.mobile.ios",
        pushEnvironment: "production",
      }),
    });

    return true;
  }

  async function clearNativePushToken(currentSession: AuthSession) {
    await relayFetch<{ cleared: boolean }>(currentSession, "/v1/devices/push-token", {
      method: "DELETE",
    });
  }

  // ---- effects ----

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    if (!activeDeviceLink || completedDeviceLinkSessionId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const { response, body } = await fetchJson<DeviceLinkStatus>(
          `${relayUrl}/v1/devices/link/status?token=${encodeURIComponent(activeDeviceLink.linkToken)}&qrMode=${encodeURIComponent(activeDeviceLink.qrMode)}`,
        );
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to refresh device-link status.");
        }
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
  }, [activeDeviceLink, completedDeviceLinkSessionId]);

  useEffect(() => {
    let mounted = true;

    function captureIncomingUrl(url: string | null) {
      if (!url || !mounted) {
        return;
      }

      const completionToken = extractCompletionTokenFromUrl(url);
      if (completionToken) {
        void completeMagicLink(completionToken);
      }

      const invite = normalizeInviteReference(url);
      if (invite) {
        setInviteInput(`${invite.groupId}/${invite.inviteToken}`);
      }
    }

    startTransition(() => {
      void (async () => {
        const nextDb = await bootstrapLocalStore();
        const [savedEmail, savedInvite, savedDeviceLabel, nextPrivacyDefaults, vaultItems, savedSession, initialUrl] =
          await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.email),
            SecureStore.getItemAsync(STORAGE_KEYS.inviteToken),
            SecureStore.getItemAsync(STORAGE_KEYS.deviceLabel),
            loadPrivacyDefaults(nextDb),
            countVaultItems(nextDb),
            loadStoredSession(),
            Linking.getInitialURL(),
          ]);

        if (!mounted) {
          return;
        }

        setDb(nextDb);
        setEmail(savedEmail ?? "");
        setInviteToken(savedInvite ?? "");
        setDeviceLabel(savedDeviceLabel ?? suggestMobileDeviceLabel());
        setPrivacyDefaults(nextPrivacyDefaults);
        setVaultCount(vaultItems);
        setSession(savedSession);
        setIsBooting(false);
        captureIncomingUrl(initialUrl);
      })();
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      captureIncomingUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!privacyDefaults.secureAppSwitcher) {
      void ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
      return;
    }

    void ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
  }, [privacyDefaults.secureAppSwitcher]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const handleNotificationSelection = (notification: Notifications.Notification) => {
      const reason = getNotificationReason(notification);
      const conversationId = getNotificationConversationId(notification);
      if (conversationId && reason === "relay_hosted_message") {
        setSelectedConversationId(conversationId);
        const currentSession = sessionRef.current;
        if (currentSession) {
          void refreshGroupThread(currentSession, conversationId).catch(() => undefined);
        }
        return;
      }

      if (reason === "mailbox") {
        const currentSession = sessionRef.current;
        if (currentSession) {
          void syncEncryptedMailbox(currentSession).catch(() => undefined);
        }
        if (conversationId) {
          setSelectedConversationId(conversationId);
        }
        setSessionMessage({
          tone: "info",
          title: "New secure message",
          body: "A secure conversation is waiting to sync on this device.",
        });
      }
    };

    let receivedSubscription: Notifications.EventSubscription | null = null;
    let responseSubscription: Notifications.EventSubscription | null = null;
    let pushTokenSubscription: Notifications.EventSubscription | null = null;

    void (async () => {
      try {
        await registerNativePushToken(session);
      } catch (error) {
        if (!cancelled) {
          console.warn("mobile_push_registration_failed", error);
        }
      }

      if (cancelled) {
        return;
      }

      receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        const conversationId = getNotificationConversationId(notification);
        const reason = getNotificationReason(notification);
        const currentSession = sessionRef.current;

        if (
          currentSession &&
          reason === "relay_hosted_message" &&
          conversationId &&
          selectedConversationIdRef.current === conversationId
        ) {
          void refreshGroupThread(currentSession, conversationId).catch(() => undefined);
        } else if (currentSession && reason === "mailbox") {
          void syncEncryptedMailbox(currentSession).catch(() => undefined);
        }
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationSelection(response.notification);
      });

      pushTokenSubscription = Notifications.addPushTokenListener((token) => {
        const currentSession = sessionRef.current;
        if (!currentSession || typeof token.data !== "string" || !token.data) {
          return;
        }

        const provider = token.type === "fcm" ? "fcm" : token.type === "apns" ? "apns" : null;
        if (!provider) {
          return;
        }

        void relayFetch<{ registered: boolean }>(currentSession, "/v1/devices/push-token", {
          method: "POST",
          body: JSON.stringify({
            provider,
            platform: Platform.OS === "android" ? "android" : "ios",
            token: token.data,
            appId: Platform.OS === "android" ? "com.emberchamber.mobile" : "com.emberchamber.mobile.ios",
            pushEnvironment: "production",
          }),
        }).catch((error) => {
          console.warn("mobile_push_token_refresh_failed", error);
        });
      });

      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse?.notification) {
        handleNotificationSelection(lastResponse.notification);
      }
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
      pushTokenSubscription?.remove();
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      deviceBundleDirectoryRef.current.clear();
      setProfile(null);
      setContactCard(null);
      setGroups([]);
      setThreadMessages([]);
      setSelectedConversationId(null);
      setPendingAttachment(null);
      setMessageDraft("");
      setDeviceBundleReady(false);
      setDeviceBundleCount(0);
      setDeviceBundleError(null);
      setProfileSetupActive(false);
      setProfileSetupName("");
      setProfileSetupError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingAccount(true);
      const cachedGroups = db ? await loadCachedGroups(db, session.accountId) : [];

      if (!cancelled && cachedGroups.length) {
        setGroups(cachedGroups);
      }

      try {
        const registeredBundles = await ensureDeviceBundleRegistered(session);
        if (!cancelled) {
          setDeviceBundleReady(true);
          setDeviceBundleCount(registeredBundles.length);
          setDeviceBundleError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setDeviceBundleReady(false);
          setDeviceBundleError(
            error instanceof Error ? error.message : "Unable to register this phone with the relay.",
          );
        }
      }

      try {
        const [nextProfile, nextCard, nextGroups] = await Promise.all([
          relayFetch<MeProfile>(session, "/v1/me"),
          relayFetch<ContactCard>(session, "/v1/me/contact-card"),
          relayFetch<GroupMembershipSummary[]>(session, "/v1/groups"),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        setContactCard(nextCard);
        setGroups(nextGroups);
        setProfileSetupActive(isDefaultDisplayName(nextProfile.displayName));
        setProfileSetupName(isDefaultDisplayName(nextProfile.displayName) ? "" : nextProfile.displayName);

        if (db) {
          await saveCachedGroups(db, session.accountId, nextGroups);
        }

        await syncEncryptedMailbox(session);

        setSessionMessage((current) => {
          if (current?.tone === "error") {
            return current;
          }

          if (session.bootstrapConversationTitle) {
            return {
              tone: "success",
              title: "You are in",
              body: `${session.bootstrapConversationTitle} is ready below. Send a short message or attach a photo when you are set.`,
            };
          }

          return current;
        });
      } catch (error) {
        if (!cancelled) {
          setSessionMessage({
            tone: cachedGroups.length ? "warning" : "error",
            title: cachedGroups.length ? "Relay sync paused" : "Signed in, but account sync failed",
            body: cachedGroups.length
              ? "Showing the last synced groups stored on this phone while the relay is unavailable."
              : error instanceof Error
                ? error.message
                : "Unable to load account state from the relay.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccount(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, session]);

  useEffect(() => {
    if (!groups.length) {
      setSelectedConversationId(null);
      setThreadMessages([]);
      return;
    }

    const selectedStillExists =
      selectedConversationId && groups.some((group) => group.id === selectedConversationId);
    if (selectedStillExists) {
      return;
    }

    const bootstrapGroup = session?.bootstrapConversationId
      ? groups.find((group) => group.id === session.bootstrapConversationId) ?? null
      : null;
    setSelectedConversationId(bootstrapGroup?.id ?? groups[0]?.id ?? null);
  }, [groups, selectedConversationId, session?.bootstrapConversationId]);

  useEffect(() => {
    if (!session || !selectedConversationId) {
      setThreadMessages([]);
      return;
    }

    const selectedGroupSummary = groups.find((group) => group.id === selectedConversationId) ?? null;
    let cancelled = false;
    setIsLoadingThread(true);
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      const cachedMessages = db
        ? await loadCachedGroupMessages(db, selectedConversationId)
        : [];

      if (!cancelled && cachedMessages.length) {
        setThreadMessages(cachedMessages);
      }

      try {
        if (selectedGroupSummary?.historyMode === "device_encrypted") {
          await syncEncryptedMailbox(session);
          if (db && !cancelled) {
            setThreadMessages(await loadCachedGroupMessages(db, selectedConversationId));
          }

          if (!cancelled) {
            refreshTimer = setInterval(() => {
              void syncEncryptedMailbox(session)
                .then(async () => {
                  if (!db || cancelled || selectedConversationIdRef.current !== selectedConversationId) {
                    return;
                  }
                  setThreadMessages(await loadCachedGroupMessages(db, selectedConversationId));
                })
                .catch(() => undefined);
            }, 8000);
          }
        } else {
          const messages = await relayFetch<GroupThreadMessage[]>(
            session,
            `/v1/groups/${selectedConversationId}/messages?limit=100`,
          );

          if (!cancelled) {
            setThreadMessages(messages);
          }

          if (db) {
            await saveCachedGroupMessages(db, selectedConversationId, messages);
          }

          if (!cancelled) {
          const wsUrlBase = relayUrl.replace(/^http/, "ws");
          const clearReconnectTimer = () => {
            if (reconnectTimer !== null) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
          };

          const connectSocket = () => {
            ws = new WebSocket(`${wsUrlBase}/v1/conversations/${selectedConversationId}/ws?token=${session.accessToken}`);
            ws.onmessage = (event) => {
              try {
                const message = JSON.parse(event.data) as GroupThreadMessage;
                setThreadMessages((prev) => {
                  if (prev.some((m) => m.id === message.id)) return prev;
                  const next = [message, ...prev].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  if (db) saveCachedGroupMessages(db, selectedConversationId, next).catch(() => {});
                  return next;
                });
              } catch {
                // Ignore unparseable messages
              }
            };
            ws.onclose = () => {
              if (!cancelled) {
                clearReconnectTimer();
                reconnectTimer = setTimeout(() => {
                  reconnectTimer = null;
                  connectSocket();
                }, 1500);
              }
            };
            ws.onerror = () => {
              ws?.close();
            };
          };

          connectSocket();
        }
        }
      } catch (error) {
        if (!cancelled) {
          setSessionMessage({
            tone: cachedMessages.length ? "warning" : "error",
            title: cachedMessages.length ? "Showing last synced thread" : "Unable to load this conversation",
            body: cachedMessages.length
              ? "Relay sync failed. The last thread copy stored on this phone is still available."
              : error instanceof Error
                ? error.message
                : "Thread sync failed.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingThread(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [db, groups, session, selectedConversationId]);

  // ---- handlers ----

  function validateForm() {
    const nextErrors: Partial<Record<Field, string>> = {};
    const bootstrapInvite = normalizeInviteReference(inviteInput);
    const requireInviteToken = inviteFieldVisible && !bootstrapInvite;

    if (!email.trim()) {
      nextErrors.email = "Enter the email that should receive the bootstrap link.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address so the inbox step can complete.";
    }

    if (requireInviteToken) {
      if (!inviteToken.trim()) {
        nextErrors.inviteToken = "New beta accounts need an invite token unless a group invite is present.";
      } else if (inviteToken.trim().length < 4) {
        nextErrors.inviteToken = "This invite token is too short to be valid.";
      }
    }

    if (inviteInput.trim() && !bootstrapInvite) {
      nextErrors.groupInvite = "Paste a full invite link or a groupId/token pair.";
    }

    if (!ageConfirmed18) {
      nextErrors.ageConfirmed18 = "EmberChamber beta access is limited to adults 18 and over.";
    }

    if (!deviceLabel.trim()) {
      nextErrors.deviceLabel = "Name this device so session review stays readable.";
    } else if (deviceLabel.trim().length < 3) {
      nextErrors.deviceLabel = "Use at least 3 characters so the device label is recognizable.";
    }

    setErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, bootstrapInvite };
  }

  async function submitMagicLink() {
    setChallenge(null);
    setFormMessage(null);

    const { isValid, bootstrapInvite } = validateForm();
    if (!isValid) {
      setFormMessage({
        tone: "error",
        title: "Fix the highlighted fields first",
        body: "This bootstrap needs a valid email, 18+ confirmation, a readable device label, and either a beta invite token or a valid group invite for new accounts.",
      });
      return;
    }

    setIsSending(true);
    try {
      const { response, body } = await fetchJson<MagicLinkResponse>(`${relayUrl}/v1/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          inviteToken: inviteToken.trim() || undefined,
          groupId: bootstrapInvite?.groupId,
          groupInviteToken: bootstrapInvite?.inviteToken,
          deviceLabel: deviceLabel.trim(),
          ageConfirmed18: true,
        }),
      });
      if (!response.ok) {
        if (body.code === "INVITE_REQUIRED") {
          setInviteFieldVisible(true);
          setErrors((current) => ({
            ...current,
            inviteToken: bootstrapInvite
              ? undefined
              : "This email does not have beta access yet. Add an invite token or use a valid group invite to continue.",
          }));
          setFormMessage({
            tone: "warning",
            title: "Invite needed for the first bootstrap",
            body: bootstrapInvite
              ? "The group invite was not enough on its own. Add the beta invite token that granted early access."
              : "Returning users can continue with email alone. New beta accounts still need an invite token or a qualifying group invite.",
          });
          return;
        }

        throw new Error(body.error ?? "Unable to start sign-in");
      }

      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.email, email.trim()),
        SecureStore.setItemAsync(STORAGE_KEYS.inviteToken, inviteToken.trim()),
        SecureStore.setItemAsync(STORAGE_KEYS.deviceLabel, deviceLabel.trim()),
      ]);

      setErrors({});
      setChallenge(body);
      setFormMessage({
        tone: "success",
        title: "Check your inbox",
        body: bootstrapInvite
          ? "Open the email link on this phone. When the app comes back, it should already know which group thread to open."
          : "Open the email link on this phone. The browser can hand the token back into EmberChamber to finish the session.",
      });
    } catch (error) {
      setFormMessage({
        tone: "error",
        title: "Unable to queue the magic link",
        body: error instanceof Error ? error.message : "Unknown relay error",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function completeMagicLink(completionToken: string) {
    setIsCompleting(true);
    setSessionMessage({
      tone: "info",
      title: "Completing sign-in",
      body: "Finishing the relay session for this phone…",
    });

    try {
      const { response, body } = await fetchJson<AuthSession>(`${relayUrl}/v1/auth/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          completionToken,
          deviceLabel: deviceLabel.trim() || suggestMobileDeviceLabel(),
        }),
      });
      if (!response.ok || !("accessToken" in body)) {
        throw new Error(body.error ?? "Unable to complete the magic link");
      }

      await persistAuthenticatedSession(body, "magic-link");
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Magic link completion failed",
        body: error instanceof Error ? error.message : "Unknown relay error",
      });
    } finally {
      setIsCompleting(false);
    }
  }

  async function signOut() {
    if (session) {
      try {
        await clearNativePushToken(session);
      } catch {
        // Ignore logout cleanup failures and clear the local session anyway.
      }
    }

    await clearStoredSession();
    setSession(null);
    setProfile(null);
    setContactCard(null);
    setGroups([]);
    setThreadMessages([]);
    setPendingAttachment(null);
    setProfileSetupActive(false);
    setProfileSetupName("");
    setProfileSetupError(null);
    setAuthMethod("magic-link");
    resetDeviceLinkState();
    setSessionMessage({
      tone: "info",
      title: "Signed out",
      body: "This device no longer has a relay session. You can request a fresh magic link whenever needed.",
    });
  }

  async function previewInvite() {
    const normalized = normalizeInviteReference(inviteInput);
    if (!normalized?.groupId || !normalized.inviteToken) {
      setInvitePreview(null);
      setInvitePreviewError("Paste a full invite link or a groupId/token pair first.");
      return;
    }

    setIsPreviewingInvite(true);
    setInvitePreviewError(null);
    try {
      const { response, body } = await fetchJson<GroupInvitePreview>(
        `${relayUrl}/v1/groups/${normalized.groupId}/invites/${encodeURIComponent(normalized.inviteToken)}/preview`,
      );
      if (!response.ok || !("group" in body)) {
        throw new Error(body.error ?? "Invite preview failed");
      }

      setInvitePreview(body);
    } catch (error) {
      setInvitePreview(null);
      setInvitePreviewError(error instanceof Error ? error.message : "Invite preview failed");
    } finally {
      setIsPreviewingInvite(false);
    }
  }

  async function acceptInvite() {
    if (!session) {
      setInvitePreviewError("Finish sign-in before accepting a group invite.");
      return;
    }

    const normalized = normalizeInviteReference(inviteInput);
    if (!normalized?.groupId || !normalized.inviteToken) {
      setInvitePreviewError("Paste a valid invite first.");
      return;
    }

    setIsAcceptingInvite(true);
    setInvitePreviewError(null);
    try {
      const result = await relayFetch<GroupInviteAcceptance>(
        session,
        `/v1/groups/${normalized.groupId}/invites/${encodeURIComponent(normalized.inviteToken)}/accept`,
        { method: "POST" },
      );

      const nextGroups = await relayFetch<GroupMembershipSummary[]>(session, "/v1/groups");
      setGroups(nextGroups);
      if (db) {
        await saveCachedGroups(db, session.accountId, nextGroups);
      }
      setSelectedConversationId(result.conversationId);
      setInvitePreview(null);
      setSessionMessage({
        tone: "success",
        title: "Group joined",
        body: `${result.title} is ready below. You can send a text or photo now.`,
      });
    } catch (error) {
      setInvitePreviewError(error instanceof Error ? error.message : "Invite acceptance failed");
    } finally {
      setIsAcceptingInvite(false);
    }
  }

  async function pickPhoto() {
    setIsPickingPhoto(true);
    setSessionMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Photo access is still blocked",
          body: "Allow gallery access so EmberChamber can attach a picture to the conversation.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: asset.width > asset.height ? 1920 : undefined, height: asset.height >= asset.width ? 1920 : undefined } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const fileSize = manipulated.width * manipulated.height * 0.3; // Approx estimation since we lose exact filesize on manipulate in EXPO SDK before fetching
      if (fileSize > MAX_ATTACHMENT_BYTES) {
        setSessionMessage({
          tone: "error",
          title: "That photo is too large",
          body: "Keep the file under 20 MB for the beta relay path.",
        });
        return;
      }

      setPendingAttachment({
        uri: manipulated.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        byteLength: Math.floor(fileSize),
        width: manipulated.width,
        height: manipulated.height,
      });
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Photo picker failed",
        body: error instanceof Error ? error.message : "Unable to open the image library.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }

  async function takePhoto() {
    setIsPickingPhoto(true);
    setSessionMessage(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Camera access is still blocked",
          body: "Allow camera access so EmberChamber can take a picture.",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: asset.width > asset.height ? 1920 : undefined, height: asset.height >= asset.width ? 1920 : undefined } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const fileSize = manipulated.width * manipulated.height * 0.3; 
      if (fileSize > MAX_ATTACHMENT_BYTES) {
        setSessionMessage({
          tone: "error",
          title: "That photo is too large",
          body: "Keep the file under 20 MB for the beta relay path.",
        });
        return;
      }

      setPendingAttachment({
        uri: manipulated.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        byteLength: Math.floor(fileSize),
        width: manipulated.width,
        height: manipulated.height,
      });
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Taking photo failed",
        body: error instanceof Error ? error.message : "Unable to take a photo.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }

  async function sendMessage() {
    if (!session || !selectedGroup) {
      setSessionMessage({
        tone: "warning",
        title: "Pick a group first",
        body: "You need an active trusted circle before this phone can send a message.",
      });
      return;
    }

    const trimmedText = messageDraft.trim();
    if (!trimmedText && !pendingAttachment) {
      return;
    }

    setIsSendingMessage(true);
    setSessionMessage(null);

    try {
      let createdMessage: GroupThreadMessage;

      if (selectedGroup.historyMode === "device_encrypted") {
        const localBundle = await loadStoredBundleOrThrow(session);
        const conversation = await relayFetch<{
          id: string;
          kind: "group";
          epoch: number;
          memberAccountIds: string[];
          members: Array<{ accountId: string }>;
        }>(session, `/v1/conversations/${selectedGroup.id}`);

        const bundleLists = await Promise.all(
          Array.from(new Set(conversation.memberAccountIds)).map(async (accountId) => ({
            accountId,
            bundles: await listDeviceBundlesForAccount(session, accountId),
          })),
        );
        const recipientDevices = bundleLists
          .flatMap((entry) => entry.bundles)
          .filter((bundle) => bundle.deviceId !== session.deviceId);

        if (recipientDevices.length === 0) {
          throw new Error("No member devices are registered for this encrypted group yet.");
        }

        let attachment: GroupThreadMessage["attachment"] | null = null;
        const attachmentIds: string[] = [];

        if (pendingAttachment) {
          const fileResponse = await fetch(pendingAttachment.uri);
          const fileBlob = await fileResponse.blob();

          if (fileBlob.size > MAX_ATTACHMENT_BYTES) {
            throw new Error("That photo exceeds the 20 MB beta attachment limit.");
          }

          const encrypted = encryptAttachmentBytes(await fileBlob.arrayBuffer());
          const ticket = await relayFetch<AttachmentTicket>(session, "/v1/attachments/ticket", {
            method: "POST",
            body: JSON.stringify({
              fileName: pendingAttachment.fileName,
              mimeType: "application/octet-stream",
              encryptionMode: "device_encrypted",
              ciphertextByteLength: encrypted.ciphertext.byteLength,
              ciphertextSha256B64: encrypted.ciphertextSha256B64,
              plaintextByteLength: encrypted.plaintext.byteLength,
              plaintextSha256B64: encrypted.plaintextSha256B64,
              conversationId: selectedGroup.id,
              conversationEpoch: selectedGroup.epoch,
              contentClass: "image",
              retentionMode: "private_vault",
              protectionProfile: selectedGroup.sensitiveMediaDefault ? "sensitive_media" : "standard",
            }),
          });

          const uploadResponse = await fetch(ticket.uploadUrl, {
            method: "PUT",
            headers: { "content-type": "application/octet-stream" },
            body: encrypted.ciphertext,
          });

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.text();
            throw new Error(uploadError || "Attachment upload failed.");
          }

          attachment = {
            id: ticket.attachmentId,
            downloadUrl: "",
            fileName: pendingAttachment.fileName,
            mimeType: pendingAttachment.mimeType,
            byteLength: fileBlob.size,
            contentClass: "image",
            retentionMode: ticket.retentionMode,
            protectionProfile: ticket.protectionProfile,
            previewBlurHash: ticket.previewBlurHash ?? null,
            encryptionMode: ticket.encryptionMode,
            fileKeyB64: encrypted.fileKeyB64,
            fileIvB64: encrypted.fileIvB64,
          };
          attachmentIds.push(ticket.attachmentId);
        }

        const createdAt = new Date().toISOString();
        const clientMessageId = makeOpaqueToken();
        const senderDisplayName = profile?.displayName ?? deviceLabel;
        const payload: EncryptedConversationPayload = {
          version: 1,
          kind: "ember_conversation_v1",
          conversationId: selectedGroup.id,
          conversationKind: "group",
          historyMode: "device_encrypted",
          senderDisplayName,
          text: trimmedText || undefined,
          attachment: attachment
            ? {
                id: attachment.id,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                byteLength: attachment.byteLength,
                contentClass: attachment.contentClass,
                retentionMode: attachment.retentionMode,
                protectionProfile: attachment.protectionProfile,
                previewBlurHash: attachment.previewBlurHash ?? null,
                encryptionMode: attachment.encryptionMode ?? "device_encrypted",
                fileKeyB64: attachment.fileKeyB64 ?? null,
                fileIvB64: attachment.fileIvB64 ?? null,
              }
            : null,
          createdAt,
          clientMessageId,
        };

        await relayFetch<{ acceptedEnvelopeIds: string[] }>(session, "/v1/messages/batch", {
          method: "POST",
          body: JSON.stringify({
            conversationId: selectedGroup.id,
            epoch: selectedGroup.epoch,
            envelopes: recipientDevices.map((bundle) => ({
              recipientDeviceId: bundle.deviceId,
              ciphertext: encryptConversationPayload(
                payload,
                bundle.bundle.identityKeyB64,
                localBundle.privateKeyB64,
              ),
              clientMessageId,
              attachmentIds,
            })),
          }),
        });

        createdMessage = {
          id: clientMessageId,
          conversationId: selectedGroup.id,
          historyMode: "device_encrypted",
          senderAccountId: session.accountId,
          senderDisplayName,
          kind: attachment ? "media" : "text",
          text: trimmedText || undefined,
          attachment,
          createdAt,
        };
      } else {
        let attachmentId: string | undefined;

        if (pendingAttachment) {
          const fileResponse = await fetch(pendingAttachment.uri);
          const fileBlob = await fileResponse.blob();

          if (fileBlob.size > MAX_ATTACHMENT_BYTES) {
            throw new Error("That photo exceeds the 20 MB beta attachment limit.");
          }

          const ticket = await relayFetch<AttachmentTicket>(session, "/v1/attachments/ticket", {
            method: "POST",
            body: JSON.stringify({
              fileName: pendingAttachment.fileName,
              mimeType: pendingAttachment.mimeType,
              byteLength: fileBlob.size,
              conversationId: selectedGroup.id,
              conversationEpoch: selectedGroup.epoch,
              contentClass: "image",
              retentionMode: "private_vault",
              protectionProfile: selectedGroup.sensitiveMediaDefault ? "sensitive_media" : "standard",
            }),
          });

          const uploadResponse = await fetch(ticket.uploadUrl, {
            method: "PUT",
            headers: { "content-type": pendingAttachment.mimeType },
            body: fileBlob,
          });

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.text();
            throw new Error(uploadError || "Attachment upload failed.");
          }

          attachmentId = ticket.attachmentId;
        }

        createdMessage = await relayFetch<GroupThreadMessage>(
          session,
          `/v1/groups/${selectedGroup.id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              text: trimmedText || undefined,
              attachmentId,
              clientMessageId: makeOpaqueToken(),
            }),
          },
        );
      }

      const nextThreadMessages = [...threadMessages, createdMessage];
      setThreadMessages(nextThreadMessages);
      setMessageDraft("");
      setPendingAttachment(null);

      if (db) {
        await saveCachedGroupMessages(db, selectedGroup.id, nextThreadMessages);

        if (createdMessage.attachment) {
          await persistVaultMediaRecord(db, createdMessage, profile?.displayName ?? deviceLabel);
          setVaultCount(await countVaultItems(db));
        }
      }
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Message failed to send",
        body: error instanceof Error ? error.message : "Unable to send this message right now.",
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function updatePrivacyDefaults<K extends keyof PrivacyDefaults>(key: K, value: PrivacyDefaults[K]) {
    setPrivacyDefaults((current) => ({ ...current, [key]: value }));

    if (!db) {
      return;
    }

    await savePrivacyDefault(db, key, typeof value === "boolean" ? (value ? "1" : "0") : value);
  }

  function handleImageError(messageId: string) {
    if (imageRefreshPendingRef.current || !session || !selectedConversationId) {
      return;
    }

    imageRefreshPendingRef.current = true;

    void (async () => {
      try {
        await refreshGroupThread(session, selectedConversationId);
      } catch {
        // Silently ignore — the user can pull-to-refresh or re-open the thread.
      } finally {
        setTimeout(() => {
          imageRefreshPendingRef.current = false;
        }, 30_000);
      }
    })();
  }

  async function submitProfileSetup() {
    if (!session) {
      return;
    }

    if (!profileSetupName.trim()) {
      setProfileSetupError("Enter a display name to continue.");
      return;
    }

    if (profileSetupName.trim().length < 2) {
      setProfileSetupError("Display name needs at least 2 characters.");
      return;
    }

    setIsSubmittingProfile(true);
    setProfileSetupError(null);

    try {
      await relayFetch<MeProfile>(session, "/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: profileSetupName.trim() }),
      });

      const nextProfile = await relayFetch<MeProfile>(session, "/v1/me");
      setProfile(nextProfile);
      setProfileSetupActive(false);
    } catch (error) {
      setProfileSetupError(
        error instanceof Error ? error.message : "Profile setup failed. Try again.",
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  // ---- render ----

  const heroSignals = session ? signedInHeroSignals : onboardingHeroSignals;

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors.textSoft} />
        <Text style={styles.loadingText}>Preparing local device storage…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundOrbTop} />
      <View pointerEvents="none" style={styles.backgroundOrbLeft} />
      <View pointerEvents="none" style={styles.backgroundOrbRight} />
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View pointerEvents="none" style={styles.heroGlow} />
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>EC</Text>
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.eyebrow}>{session ? "Android companion" : "Android beta"}</Text>
                <Text style={styles.brandName}>EmberChamber</Text>
              </View>
            </View>
            <Text style={styles.title}>
              {session
                ? "Keep your trusted circles reachable on this phone"
                : "Invite to first trusted-circle message should feel fast and intentional"}
            </Text>
            <Text style={styles.subtitle}>
              {session
                ? "Android now follows the same ember-toned companion surface as the web app, while keeping relay sign-in, recent group threads, and photo attachments ready on-device."
                : "The fastest path is still invite, private email, adults-only confirmation, device label, and inbox completion handed straight back into the app."}
            </Text>
            <View style={styles.heroSignalRow}>
              {heroSignals.map((signal) => (
                <View key={signal} style={styles.heroSignalChip}>
                  <Text style={styles.heroSignalText}>{signal}</Text>
                </View>
              ))}
            </View>
          </View>

          {!session ? (
            <OnboardingScreen
              authMethod={authMethod}
              setAuthMethod={setAuthMethod}
              email={email}
              setEmail={setEmail}
              inviteToken={inviteToken}
              setInviteToken={setInviteToken}
              deviceLabel={deviceLabel}
              setDeviceLabel={setDeviceLabel}
              ageConfirmed18={ageConfirmed18}
              setAgeConfirmed18={setAgeConfirmed18}
              inviteInput={inviteInput}
              setInviteInput={setInviteInput}
              inviteFieldVisible={inviteFieldVisible}
              setInviteFieldVisible={setInviteFieldVisible}
              isSending={isSending}
              isCompleting={isCompleting}
              challenge={challenge}
              errors={errors}
              setErrors={setErrors}
              formMessage={formMessage}
              sessionMessage={sessionMessage}
              onSubmit={() => void submitMagicLink()}
              onCompleteMagicLink={(token) => void completeMagicLink(token)}
              deviceLinkQrValue={deviceLinkQrValue}
              deviceLinkStatus={deviceLinkStatus}
              deviceLinkMessage={deviceLinkMessage}
              isWorkingDeviceLink={isWorkingDeviceLink}
              onShowDeviceLinkQr={() => void beginTargetDeviceLink()}
              onScanDeviceLinkQr={(payload) => scanDeviceLinkQr(payload)}
              onResetDeviceLink={resetDeviceLinkState}
            />
          ) : profileSetupActive ? (
            <ProfileSetupScreen
              sessionMessage={sessionMessage}
              profileSetupName={profileSetupName}
              setProfileSetupName={setProfileSetupName}
              profileSetupError={profileSetupError}
              setProfileSetupError={setProfileSetupError}
              isSubmittingProfile={isSubmittingProfile}
              onSubmit={() => void submitProfileSetup()}
            />
          ) : (
            <MainScreen
              session={session}
              profile={profile}
              contactCard={contactCard}
              groups={groups}
              selectedConversationId={selectedConversationId}
              setSelectedConversationId={setSelectedConversationId}
              selectedGroup={selectedGroup ?? null}
              threadMessages={threadMessages}
              inviteInput={inviteInput}
              setInviteInput={setInviteInput}
              invitePreview={invitePreview}
              invitePreviewError={invitePreviewError}
              messageDraft={messageDraft}
              setMessageDraft={setMessageDraft}
              pendingAttachment={pendingAttachment}
              setPendingAttachment={setPendingAttachment}
              isLoadingAccount={isLoadingAccount}
              isLoadingThread={isLoadingThread}
              isPreviewingInvite={isPreviewingInvite}
              isAcceptingInvite={isAcceptingInvite}
              isPickingPhoto={isPickingPhoto}
              isSendingMessage={isSendingMessage}
              deviceBundleReady={deviceBundleReady}
              deviceBundleCount={deviceBundleCount}
              deviceBundleError={deviceBundleError}
              vaultCount={vaultCount}
              privacyDefaults={privacyDefaults}
              sessionMessage={sessionMessage}
              email={email}
              deviceLabel={deviceLabel}
              deviceLinkQrValue={deviceLinkQrValue}
              deviceLinkStatus={deviceLinkStatus}
              deviceLinkMessage={deviceLinkMessage}
              isWorkingDeviceLink={isWorkingDeviceLink}
              isApprovingDeviceLink={isApprovingDeviceLink}
              onSignOut={() => void signOut()}
              onShowDeviceLinkQr={() => void beginSourceDeviceLink()}
              onScanDeviceLinkQr={(payload) => scanDeviceLinkQr(payload)}
              onApproveDeviceLink={() => void approveDeviceLink()}
              onResetDeviceLink={resetDeviceLinkState}
              onPreviewInvite={() => void previewInvite()}
              onAcceptInvite={() => void acceptInvite()}
              onPickPhoto={() => void pickPhoto()}
              onTakePhoto={() => void takePhoto()}
              onSendMessage={() => void sendMessage()}
              onUpdatePrivacy={updatePrivacyDefaults}
              onImageError={handleImageError}
            />
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trust boundary</Text>
            {onboardingAssurances.map((item) => (
              <Text key={item} style={styles.bullet}>
                • {item}
              </Text>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
