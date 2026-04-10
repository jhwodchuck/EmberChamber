import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Notifications from "expo-notifications";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
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
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
  GroupInviteRecord,
  GroupMember,
  GroupMembershipSummary,
  GroupThreadMessage,
  MagicLinkResponse,
  MeProfile,
  PendingAttachment,
  PrivacyDefaults,
  RelayErrorResponse,
  SessionDescriptor,
} from "./src/types";
import type { ContextMenuAction } from "./src/components/MessageContextMenu";
import type { LocationChoice } from "./src/components/LocationPickerSheet";
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
  isLegacySuggestedDeviceLabel,
  isValidEmail,
  makeOpaqueToken,
  normalizeInviteReference,
  getMobileDeviceModel,
  suggestMobileDeviceLabel,
} from "./src/lib/utils";
import {
  bootstrapLocalStore,
  countVaultItems,
  loadCachedGroupMessages,
  loadCachedGroups,
  loadContactLabel,
  loadRelayStateValue,
  loadPrivacyDefaults,
  persistVaultMediaRecord,
  saveContactLabel,
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
import { useConversationCatalog } from "./src/hooks/useConversationCatalog";
import { usePersistedMainShellState } from "./src/hooks/usePersistedMainShellState";
import { styles, theme } from "./src/styles";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { MainScreen } from "./src/screens/MainScreen";

const onboardingHeroSignals = [
  "Invite-only onboarding",
  "Adults-only access",
  "Local-first history",
];

const appConfig = require("./app.json") as {
  expo?: {
    version?: string;
    android?: { versionCode?: number };
    ios?: { buildNumber?: string };
  };
};

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
  const [inviteFocusToken, setInviteFocusToken] = useState(0);
  const [messageDraft, setMessageDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
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
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [threadMessages, setThreadMessages] = useState<GroupThreadMessage[]>(
    [],
  );
  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(
    null,
  );
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(
    null,
  );
  const [inviteFieldVisible, setInviteFieldVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [sessionMessage, setSessionMessage] = useState<FormMessage | null>(
    null,
  );
  const [vaultCount, setVaultCount] = useState(0);
  const [deviceBundleCount, setDeviceBundleCount] = useState(0);
  const [deviceBundleReady, setDeviceBundleReady] = useState(false);
  const [deviceBundleError, setDeviceBundleError] = useState<string | null>(
    null,
  );
  const [privacyDefaults, setPrivacyDefaults] = useState<PrivacyDefaults>(
    defaultPrivacyDefaults,
  );
  const [profileSetupActive, setProfileSetupActive] = useState(false);
  const [profileSetupName, setProfileSetupName] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState<string | null>(
    null,
  );
  const [deviceLinkQrValue, setDeviceLinkQrValue] = useState<string | null>(
    null,
  );
  const [deviceLinkStatus, setDeviceLinkStatus] =
    useState<DeviceLinkStatus | null>(null);
  const [deviceLinkMessage, setDeviceLinkMessage] =
    useState<FormMessage | null>(null);
  const [isWorkingDeviceLink, setIsWorkingDeviceLink] = useState(false);
  const [isApprovingDeviceLink, setIsApprovingDeviceLink] = useState(false);
  const [activeDeviceLink, setActiveDeviceLink] =
    useState<ActiveDeviceLink | null>(null);
  const [completedDeviceLinkSessionId, setCompletedDeviceLinkSessionId] =
    useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isOpeningDm, setIsOpeningDm] = useState(false);
  const [sessions, setSessions] = useState<SessionDescriptor[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const imageRefreshPendingRef = useRef(false);
  const groupsRef = useRef<GroupMembershipSummary[]>([]);
  const sessionRef = useRef<AuthSession | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const deviceBundleDirectoryRef = useRef(new Map<string, DeviceKeyBundle[]>());

  const selectedGroup =
    groups.find((group) => group.id === selectedConversationId) ??
    (session?.bootstrapConversationId
      ? (groups.find((group) => group.id === session.bootstrapConversationId) ??
        null)
      : null);

  const {
    conversationPreviews,
    conversationPreferences,
    getConversationPreference,
    refreshFromCache: refreshConversationCatalog,
    unreadConversationCounts,
    updateConversationPreference,
  } = useConversationCatalog({
    db,
    session,
    groups,
    selectedConversationId,
    threadMessages,
  });
  const {
    isMainShellReady,
    mainShellState,
    persistConversationAnchor,
    persistMainShellState,
    restoredConversationAnchorId,
    restoredConversationId,
  } = usePersistedMainShellState({
    db,
    session,
    selectedConversationId,
  });
  const unreadConversationIds = new Set(
    Object.entries(unreadConversationCounts)
      .filter(([, count]) => count > 0)
      .map(([conversationId]) => conversationId),
  );

  // ---- relay helpers (stay here because they close over setSession) ----

  function buildRelayClientHeaders() {
    const appVersion = appConfig.expo?.version?.trim() || "0.1.0";
    const buildVersion =
      Platform.OS === "android"
        ? String(appConfig.expo?.android?.versionCode ?? "")
        : String(appConfig.expo?.ios?.buildNumber ?? "");
    const deviceModel = getMobileDeviceModel();

    return {
      "x-emberchamber-client-platform": Platform.OS,
      "x-emberchamber-client-version": appVersion,
      ...(buildVersion ? { "x-emberchamber-client-build": buildVersion } : {}),
      ...(deviceModel ? { "x-emberchamber-device-model": deviceModel } : {}),
    };
  }

  async function fetchJson<T>(
    url: string,
    init?: RequestInit,
    timeoutMs = 15_000,
  ): Promise<{ response: Response; body: T & RelayErrorResponse }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(init?.headers ?? {});
      Object.entries(buildRelayClientHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
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
        throw new Error(
          "The relay took too long to respond. Check your connection and try again.",
        );
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

  async function refreshSignedInSessions(currentSession: AuthSession) {
    setIsLoadingSessions(true);

    try {
      const nextSessions = await relayFetch<SessionDescriptor[]>(
        currentSession,
        "/v1/sessions",
      );
      setSessions(nextSessions);
      setSessionsError(null);
    } catch (error) {
      setSessionsError(
        error instanceof Error
          ? error.message
          : "Unable to load signed-in sessions.",
      );
    } finally {
      setIsLoadingSessions(false);
    }
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

  async function loadPendingAttachmentFile(attachment: PendingAttachment) {
    const file = new ExpoFile(attachment.uri);
    if (!file.exists) {
      throw new Error("That photo is no longer available on this device.");
    }

    return file;
  }

  async function uploadAttachmentBytes(
    uploadUrl: string,
    mimeType: string,
    bytes: ArrayBuffer,
  ) {
    // Hermes does not support new Blob([ArrayBuffer | ArrayBufferView]), so we
    // pass an ArrayBuffer directly as the fetch body instead.
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": mimeType },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      throw new Error(uploadError || "Attachment upload failed.");
    }
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
        throw new Error(
          "The relay returned an unreadable device-link QR payload.",
        );
      }

      const qrPayload = encodeDeviceLinkQrPayload({
        relayOrigin: getRelayOrigin(),
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
          relayOrigin: getRelayOrigin(),
          qrMode: "source_display",
          state: "pending_claim",
          requesterLabel,
          expiresAt: response.expiresAt,
          canComplete: false,
        },
      };
    }
  }

  function buildSessionReadyMessage(
    nextSession: AuthSession,
    source: "magic-link" | "device-link",
  ): FormMessage {
    if (nextSession.bootstrapConversationTitle) {
      return {
        tone: "success",
        title:
          source === "device-link"
            ? "Device linked and thread ready"
            : "Signed in and thread ready",
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

  async function persistAuthenticatedSession(
    nextSession: AuthSession,
    source: "magic-link" | "device-link",
  ) {
    const normalizedDeviceLabel =
      deviceLabel.trim() || suggestMobileDeviceLabel();
    const bootstrapInvite = normalizeInviteReference(inviteInput);

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
    if (bootstrapInvite) {
      setInviteFocusToken((current) => current + 1);
      setSessionMessage({
        tone: "success",
        title:
          source === "device-link"
            ? "Device linked and invite ready"
            : "Signed in and invite ready",
        body: "The incoming invite is loaded under Invites. Review the preview there and join when you are ready.",
      });
    } else {
      setSessionMessage(buildSessionReadyMessage(nextSession, source));
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
      const normalizedDeviceLabel =
        deviceLabel.trim() || suggestMobileDeviceLabel();
      const response = await relayFetch<DeviceLinkStartResponse>(
        currentSession,
        "/v1/devices/link/start",
        {
          method: "POST",
          body: JSON.stringify({ deviceLabel: normalizedDeviceLabel }),
        },
      );
      const normalized = normalizeStartedSourceDeviceLink(
        response,
        normalizedDeviceLabel,
      );

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
        relayOrigin: getRelayOrigin(),
        qrMode: "target_display",
        linkToken,
        requesterLabel: normalizedDeviceLabel,
      });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await SecureStore.setItemAsync(
        STORAGE_KEYS.deviceLabel,
        normalizedDeviceLabel,
      );

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
          throw new Error(
            "That QR is meant for a new device, not a signed-in device.",
          );
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
        throw new Error(
          "Name this phone before scanning so the approval request is readable.",
        );
      }
      if (parsed.qrMode !== "source_display") {
        throw new Error(
          "That QR is meant to be scanned by a signed-in device.",
        );
      }

      const normalizedDeviceLabel = deviceLabel.trim();
      await SecureStore.setItemAsync(
        STORAGE_KEYS.deviceLabel,
        normalizedDeviceLabel,
      );

      const { response, body } = await fetchJson<DeviceLinkStatus>(
        `${relayUrl}/v1/devices/link/claim`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            qrPayload,
            deviceLabel: normalizedDeviceLabel,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          body.error ?? "Unable to claim this device-link request.",
        );
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

  async function completeDeviceLink(
    linkToken: string,
    qrMode: DeviceLinkQrMode,
  ) {
    const { response, body } = await fetchJson<AuthSession>(
      `${relayUrl}/v1/devices/link/complete`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkToken, qrMode }),
      },
    );
    if (!response.ok || !("accessToken" in body)) {
      throw new Error(body.error ?? "Unable to complete device linking.");
    }

    await persistAuthenticatedSession(body, "device-link");
  }

  async function ensureDeviceBundleRegistered(currentSession: AuthSession) {
    const localBundle =
      (await loadStoredDeviceBundle(currentSession.deviceId)) ??
      createDeviceBundleScaffold();
    await saveStoredDeviceBundle(currentSession.deviceId, localBundle);

    const existingBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );
    deviceBundleDirectoryRef.current.set(
      currentSession.accountId,
      existingBundles,
    );

    if (
      existingBundles.some(
        (bundle) => bundle.deviceId === currentSession.deviceId,
      ) &&
      localBundle.privateKeyB64
    ) {
      return existingBundles;
    }

    await relayFetch<{ registered: boolean }>(
      currentSession,
      "/v1/devices/register",
      {
        method: "POST",
        body: JSON.stringify(toPublicPrekeyBundle(localBundle)),
      },
    );

    const confirmedBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );
    deviceBundleDirectoryRef.current.set(
      currentSession.accountId,
      confirmedBundles,
    );

    if (
      !confirmedBundles.some(
        (bundle) => bundle.deviceId === currentSession.deviceId,
      )
    ) {
      throw new Error(
        "This phone's device identity did not register correctly.",
      );
    }

    return confirmedBundles;
  }

  async function listDeviceBundlesForAccount(
    currentSession: AuthSession,
    accountId: string,
  ) {
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
        const senderBundles = await listDeviceBundlesForAccount(
          currentSession,
          envelope.senderAccountId,
        );
        const senderBundle = senderBundles.find(
          (entry) => entry.deviceId === envelope.senderDeviceId,
        );
        if (!senderBundle) {
          continue;
        }

        const payload =
          decryptConversationPayload<EncryptedConversationPayload>(
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
          .sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          );

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

    if (updatedMessages.size > 0) {
      refreshConversationCatalog();
    }

    if (sync.cursor.lastSeenEnvelopeId) {
      await saveRelayStateValue(
        db,
        MAILBOX_CURSOR_STATE_KEY,
        sync.cursor.lastSeenEnvelopeId,
      );
    }

    if (ackEnvelopeIds.length > 0) {
      await relayFetch<{ acknowledged: number }>(
        currentSession,
        "/v1/mailbox/ack",
        {
          method: "POST",
          body: JSON.stringify({ envelopeIds: ackEnvelopeIds }),
        },
      );
    }

    return {
      receivedConversationIds: Array.from(receivedConversationIds),
    };
  }

  async function refreshGroupThread(
    currentSession: AuthSession,
    conversationId: string,
  ) {
    const targetGroup = groupsRef.current.find(
      (group) => group.id === conversationId,
    );
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
      refreshConversationCatalog();
    }

    // Ack the latest message so other members' ✓✓ updates
    const latest = messages[messages.length - 1];
    if (latest) {
      void relayFetch<{ acked: boolean }>(
        currentSession,
        `/v1/groups/${conversationId}/messages/ack`,
        {
          method: "POST",
          body: JSON.stringify({ lastReadMessageCreatedAt: latest.createdAt }),
        },
      ).catch(() => undefined);
    }
  }

  async function registerNativePushToken(currentSession: AuthSession) {
    await ensurePushRuntimeConfiguredAsync();
    const registration = await getNativeDevicePushRegistrationAsync();

    if (!registration) {
      try {
        await relayFetch<{ cleared: boolean }>(
          currentSession,
          "/v1/devices/push-token",
          {
            method: "DELETE",
          },
        );
      } catch {
        // Ignore cleanup errors if push was never registered server-side.
      }
      return false;
    }

    await relayFetch<{ registered: boolean }>(
      currentSession,
      "/v1/devices/push-token",
      {
        method: "POST",
        body: JSON.stringify({
          ...registration,
          appId:
            Platform.OS === "android"
              ? "com.emberchamber.mobile"
              : "com.emberchamber.mobile.ios",
          pushEnvironment: "production",
        }),
      },
    );

    return true;
  }

  async function clearNativePushToken(currentSession: AuthSession) {
    await relayFetch<{ cleared: boolean }>(
      currentSession,
      "/v1/devices/push-token",
      {
        method: "DELETE",
      },
    );
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
          const awaitingSourceScan =
            !sessionRef.current &&
            activeDeviceLink.qrMode === "target_display" &&
            body.code === "DEVICE_LINK_NOT_FOUND";
          if (!awaitingSourceScan) {
            throw new Error(
              body.error ?? "Unable to refresh device-link status.",
            );
          }
        } else {
          if (cancelled) {
            return;
          }

          setDeviceLinkStatus(body);

          if (!sessionRef.current && body.state === "approved") {
            await completeDeviceLink(
              activeDeviceLink.linkToken,
              activeDeviceLink.qrMode,
            );
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
            body:
              error instanceof Error ? error.message : "Unknown relay error",
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

    function captureIncomingUrl(
      url: string | null,
      options: { signedIn?: boolean } = {},
    ) {
      if (!url || !mounted) {
        return;
      }

      const signedIn = options.signedIn ?? !!sessionRef.current;

      const completionToken = extractCompletionTokenFromUrl(url);
      if (completionToken) {
        void completeMagicLink(completionToken);
      }

      const invite = normalizeInviteReference(url);
      if (invite) {
        const normalizedValue = `${invite.groupId}/${invite.inviteToken}`;
        if (!signedIn) {
          setAuthMethod("magic-link");
        }
        void previewInviteReference(normalizedValue, {
          source: "deep-link",
          routeToInvites: signedIn,
          signedIn,
        });
      }
    }

    startTransition(() => {
      void (async () => {
        const nextDb = await bootstrapLocalStore();
        const [
          savedEmail,
          savedInvite,
          savedDeviceLabel,
          nextPrivacyDefaults,
          vaultItems,
          savedSession,
          initialUrl,
        ] = await Promise.all([
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

        const suggestedDeviceLabel = suggestMobileDeviceLabel();
        setDb(nextDb);
        setEmail(savedEmail ?? "");
        setInviteToken(savedInvite ?? "");
        setDeviceLabel(
          isLegacySuggestedDeviceLabel(savedDeviceLabel)
            ? suggestedDeviceLabel
            : (savedDeviceLabel ?? suggestedDeviceLabel),
        );
        setPrivacyDefaults(nextPrivacyDefaults);
        setVaultCount(vaultItems);
        setSession(savedSession);
        setIsBooting(false);
        captureIncomingUrl(initialUrl, { signedIn: !!savedSession });
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
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(
      () => undefined,
    );
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const handleNotificationSelection = (
      notification: Notifications.Notification,
    ) => {
      const reason = getNotificationReason(notification);
      const conversationId = getNotificationConversationId(notification);
      if (conversationId && reason === "relay_hosted_message") {
        setSelectedConversationId(conversationId);
        const currentSession = sessionRef.current;
        if (currentSession) {
          void refreshGroupThread(currentSession, conversationId).catch(
            () => undefined,
          );
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

      receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          const conversationId = getNotificationConversationId(notification);
          const reason = getNotificationReason(notification);
          const currentSession = sessionRef.current;

          if (
            currentSession &&
            reason === "relay_hosted_message" &&
            conversationId &&
            selectedConversationIdRef.current === conversationId
          ) {
            void refreshGroupThread(currentSession, conversationId).catch(
              () => undefined,
            );
          } else if (currentSession && reason === "mailbox") {
            void syncEncryptedMailbox(currentSession).catch(() => undefined);
          }
        },
      );

      responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          handleNotificationSelection(response.notification);
        });

      pushTokenSubscription = Notifications.addPushTokenListener((token) => {
        const currentSession = sessionRef.current;
        if (!currentSession || typeof token.data !== "string" || !token.data) {
          return;
        }

        const provider =
          token.type === "fcm" ? "fcm" : token.type === "apns" ? "apns" : null;
        if (!provider) {
          return;
        }

        void relayFetch<{ registered: boolean }>(
          currentSession,
          "/v1/devices/push-token",
          {
            method: "POST",
            body: JSON.stringify({
              provider,
              platform: Platform.OS === "android" ? "android" : "ios",
              token: token.data,
              appId:
                Platform.OS === "android"
                  ? "com.emberchamber.mobile"
                  : "com.emberchamber.mobile.ios",
              pushEnvironment: "production",
            }),
          },
        ).catch((error) => {
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
      setSessions([]);
      setSessionsError(null);
      setIsLoadingSessions(false);
      setProfileSetupActive(false);
      setProfileSetupName("");
      setProfileSetupError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingAccount(true);
      const cachedGroups = db
        ? await loadCachedGroups(db, session.accountId)
        : [];

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
            error instanceof Error
              ? error.message
              : "Unable to register this phone with the relay.",
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
        setProfileSetupName(
          isDefaultDisplayName(nextProfile.displayName)
            ? ""
            : nextProfile.displayName,
        );

        if (db) {
          await saveCachedGroups(db, session.accountId, nextGroups);
        }

        await refreshSignedInSessions(session);
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
            title: cachedGroups.length
              ? "Relay sync paused"
              : "Signed in, but account sync failed",
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

    if (!isMainShellReady) {
      return;
    }

    const selectedStillExists =
      selectedConversationId &&
      groups.some((group) => group.id === selectedConversationId);
    if (selectedStillExists) {
      return;
    }

    const restoredGroup = restoredConversationId
      ? (groups.find((group) => group.id === restoredConversationId) ?? null)
      : null;
    const bootstrapGroup = session?.bootstrapConversationId
      ? (groups.find((group) => group.id === session.bootstrapConversationId) ??
        null)
      : null;
    setSelectedConversationId(
      restoredGroup?.id ?? bootstrapGroup?.id ?? groups[0]?.id ?? null,
    );
  }, [
    groups,
    isMainShellReady,
    restoredConversationId,
    selectedConversationId,
    session?.bootstrapConversationId,
  ]);

  useEffect(() => {
    if (!session || !selectedConversationId) {
      setThreadMessages([]);
      setGroupMembers([]);
      return;
    }

    const selectedGroupSummary =
      groups.find((group) => group.id === selectedConversationId) ?? null;
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
            setThreadMessages(
              await loadCachedGroupMessages(db, selectedConversationId),
            );
          }

          if (!cancelled) {
            refreshTimer = setInterval(() => {
              void syncEncryptedMailbox(session)
                .then(async () => {
                  if (
                    !db ||
                    cancelled ||
                    selectedConversationIdRef.current !== selectedConversationId
                  ) {
                    return;
                  }
                  setThreadMessages(
                    await loadCachedGroupMessages(db, selectedConversationId),
                  );
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

          // Ack so other members' ✓✓ updates
          const latestOnLoad = messages[messages.length - 1];
          if (latestOnLoad) {
            void relayFetch<{ acked: boolean }>(
              session,
              `/v1/groups/${selectedConversationId}/messages/ack`,
              {
                method: "POST",
                body: JSON.stringify({
                  lastReadMessageCreatedAt: latestOnLoad.createdAt,
                }),
              },
            ).catch(() => undefined);
          }

          if (!cancelled) {
            const wsUrlBase = relayUrl.replace(/^http/, "ws");
            const clearReconnectTimer = () => {
              if (reconnectTimer !== null) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
              }
            };

            const connectSocket = async (refreshBeforeConnect = false) => {
              try {
                const activeSession = sessionRef.current ?? session;
                if (!activeSession) {
                  return;
                }

                const socketSession = refreshBeforeConnect
                  ? ((await refreshRelaySession(activeSession)) ??
                    sessionRef.current)
                  : activeSession;
                if (cancelled || !socketSession?.accessToken) {
                  return;
                }

                ws = new WebSocket(
                  `${wsUrlBase}/v1/conversations/${selectedConversationId}/ws?token=${socketSession.accessToken}`,
                );
                ws.onmessage = (event) => {
                  try {
                    const message = JSON.parse(
                      event.data,
                    ) as GroupThreadMessage;
                    setThreadMessages((prev) => {
                      if (prev.some((entry) => entry.id === message.id)) {
                        return prev;
                      }
                      const next = [message, ...prev].sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime(),
                      );
                      if (db) {
                        saveCachedGroupMessages(
                          db,
                          selectedConversationId,
                          next,
                        ).catch(() => {});
                      }
                      return next;
                    });
                    if (
                      selectedConversationIdRef.current ===
                      selectedConversationId
                    ) {
                      void relayFetch<{ acked: boolean }>(
                        socketSession,
                        `/v1/groups/${selectedConversationId}/messages/ack`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            lastReadMessageCreatedAt: message.createdAt,
                          }),
                        },
                      ).catch(() => undefined);
                    }
                  } catch {
                    // Ignore unparseable messages
                  }
                };
                ws.onclose = () => {
                  if (!cancelled) {
                    clearReconnectTimer();
                    reconnectTimer = setTimeout(() => {
                      reconnectTimer = null;
                      void connectSocket(true);
                    }, 1500);
                  }
                };
                ws.onerror = () => {
                  ws?.close();
                };
              } catch {
                if (!cancelled) {
                  clearReconnectTimer();
                  reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    void connectSocket(true);
                  }, 1500);
                }
              }
            };

            void connectSocket();
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSessionMessage({
            tone: cachedMessages.length ? "warning" : "error",
            title: cachedMessages.length
              ? "Showing last synced thread"
              : "Unable to load this conversation",
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
      nextErrors.email =
        "Enter the email that should receive the bootstrap link.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email =
        "Enter a valid email address so the inbox step can complete.";
    }

    if (requireInviteToken) {
      if (!inviteToken.trim()) {
        nextErrors.inviteToken =
          "New beta accounts need an invite token unless a group invite is present.";
      } else if (inviteToken.trim().length < 4) {
        nextErrors.inviteToken = "This invite token is too short to be valid.";
      }
    }

    if (inviteInput.trim() && !bootstrapInvite) {
      nextErrors.groupInvite =
        "Paste a full invite link or a groupId/token pair.";
    }

    if (!ageConfirmed18) {
      nextErrors.ageConfirmed18 =
        "EmberChamber beta access is limited to adults 18 and over.";
    }

    if (!deviceLabel.trim()) {
      nextErrors.deviceLabel =
        "Name this device so session review stays readable.";
    } else if (deviceLabel.trim().length < 3) {
      nextErrors.deviceLabel =
        "Use at least 3 characters so the device label is recognizable.";
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
      const { response, body } = await fetchJson<MagicLinkResponse>(
        `${relayUrl}/v1/auth/start`,
        {
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
        },
      );
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
      const { response, body } = await fetchJson<AuthSession>(
        `${relayUrl}/v1/auth/complete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            completionToken,
            deviceLabel: deviceLabel.trim() || suggestMobileDeviceLabel(),
          }),
        },
      );
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

  async function previewInviteReference(
    rawValue: string,
    options: {
      routeToInvites?: boolean;
      signedIn?: boolean;
      source?: "deep-link" | "manual";
    } = {},
  ) {
    const {
      routeToInvites = false,
      signedIn = !!sessionRef.current,
      source = "manual",
    } = options;
    const normalized = normalizeInviteReference(rawValue);
    const normalizedValue = normalized
      ? `${normalized.groupId}/${normalized.inviteToken}`
      : rawValue.trim();

    setInviteInput(normalizedValue);
    if (routeToInvites) {
      setInviteFocusToken((current) => current + 1);
    }

    if (!normalized?.groupId || !normalized.inviteToken) {
      const message = "Paste a full invite link or a groupId/token pair first.";
      setInvitePreview(null);
      setInvitePreviewError(message);
      if (source === "deep-link") {
        const nextMessage = {
          tone: "warning" as const,
          title: "Invite link needs attention",
          body: message,
        };
        if (signedIn) {
          setSessionMessage(nextMessage);
        } else {
          setFormMessage(nextMessage);
        }
      }
      return null;
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

      if (source === "deep-link") {
        if (signedIn) {
          setSessionMessage({
            tone: "info",
            title: "Invite ready",
            body: `${body.group.title} is open under Invites. Review the preview and accept it when ready.`,
          });
        } else {
          setFormMessage({
            tone: "info",
            title: "Invite ready",
            body: `${body.group.title} is loaded on this phone. Finish sign-in here when you want to join it.`,
          });
        }
      }

      return body;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invite preview failed";
      setInvitePreview(null);
      setInvitePreviewError(message);
      if (source === "deep-link") {
        const nextMessage = {
          tone: "error" as const,
          title: "Invite preview failed",
          body: message,
        };
        if (signedIn) {
          setSessionMessage(nextMessage);
        } else {
          setFormMessage(nextMessage);
        }
      }
      return null;
    } finally {
      setIsPreviewingInvite(false);
    }
  }

  async function previewInvite() {
    await previewInviteReference(inviteInput);
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

      const nextGroups = await relayFetch<GroupMembershipSummary[]>(
        session,
        "/v1/groups",
      );
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
      setInvitePreviewError(
        error instanceof Error ? error.message : "Invite acceptance failed",
      );
    } finally {
      setIsAcceptingInvite(false);
    }
  }

  async function buildPendingAttachmentFromAsset(
    asset: ImagePicker.ImagePickerAsset,
  ) {
    const assetFile = new ExpoFile(asset.uri);
    const inferredMimeType =
      asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg");
    const inferredByteLength = asset.fileSize ?? assetFile.size ?? 0;
    const isVideo =
      asset.type === "video" || inferredMimeType.startsWith("video/");

    if (isVideo) {
      if (inferredByteLength > MAX_ATTACHMENT_BYTES) {
        throw new Error("That video exceeds the 20 MB beta attachment limit.");
      }

      return {
        uri: asset.uri,
        fileName: asset.fileName ?? `video-${Date.now()}.mp4`,
        mimeType: inferredMimeType,
        byteLength: inferredByteLength,
        width: asset.width,
        height: asset.height,
      } satisfies PendingAttachment;
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        {
          resize: {
            width: asset.width > asset.height ? 1920 : undefined,
            height: asset.height >= asset.width ? 1920 : undefined,
          },
        },
      ],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );

    const manipulatedFile = new ExpoFile(manipulated.uri);
    const byteLength =
      manipulatedFile.size ||
      Math.floor(manipulated.width * manipulated.height * 0.3);
    if (byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error("That photo exceeds the 20 MB beta attachment limit.");
    }

    return {
      uri: manipulated.uri,
      fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      byteLength,
      width: manipulated.width,
      height: manipulated.height,
    } satisfies PendingAttachment;
  }

  async function pickPhoto() {
    setIsPickingPhoto(true);
    setSessionMessage(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Media access is still blocked",
          body: "Allow photo and video access so EmberChamber can attach media to the conversation.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      setPendingAttachment(await buildPendingAttachmentFromAsset(asset));
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Media picker failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to open the media library.",
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
          body: "Allow camera access so EmberChamber can capture a photo or video.",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      setPendingAttachment(await buildPendingAttachmentFromAsset(asset));
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Camera capture failed",
        body:
          error instanceof Error ? error.message : "Unable to capture media.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }

  function getContentClass(
    mimeType: string,
  ): "image" | "video" | "audio" | "file" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "file";
  }

  async function pickFile() {
    setIsPickingPhoto(true);
    setSessionMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
        setSessionMessage({
          tone: "error",
          title: "File too large",
          body: "Keep attachments under 20 MB for the beta relay path.",
        });
        return;
      }
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
        byteLength: asset.size ?? 0,
      });
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "File picker failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to open the file picker.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }

  async function pickLocation(choice: LocationChoice) {
    setSessionMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setSessionMessage({
          tone: "warning",
          title: "Location access denied",
          body: "Allow location access in device settings to share your position.",
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude, accuracy } = loc.coords;

      const latStr = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? "N" : "S"}`;
      const lngStr = `${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? "E" : "W"}`;
      const mapsUrl = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

      let header: string;
      if (choice.kind === "live") {
        const dur =
          choice.durationMinutes < 60
            ? `${choice.durationMinutes} min`
            : `${choice.durationMinutes / 60} hr`;
        header = `\uD83D\uDCCD Live location (${dur} — one-time in beta)`;
      } else {
        header = "\uD83D\uDCCD Location";
      }

      const lines: string[] = [header, `${latStr}, ${lngStr}`];
      if (accuracy) lines.push(`Accuracy: \u00B1${Math.round(accuracy)} m`);
      lines.push(mapsUrl);

      await sendMessage(lines.join("\n"));
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Location failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to get your current location.",
      });
    }
  }

  async function sendMessage(overrideText?: string) {
    if (!session || !selectedGroup) {
      setSessionMessage({
        tone: "warning",
        title: "Pick a group first",
        body: "You need an active trusted circle before this phone can send a message.",
      });
      return;
    }

    const trimmedText = (overrideText ?? messageDraft).trim();
    if (!trimmedText && !pendingAttachment) {
      return;
    }

    setIsSendingMessage(true);
    setSessionMessage(null);

    try {
      // ---- edit existing message ----
      if (
        editingMessageId &&
        selectedGroup.historyMode !== "device_encrypted"
      ) {
        await relayFetch<{ updated: boolean }>(
          session,
          `/v1/groups/${selectedGroup.id}/messages/${editingMessageId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ text: trimmedText }),
          },
        );
        setThreadMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId
              ? { ...m, text: trimmedText, editedAt: new Date().toISOString() }
              : m,
          ),
        );
        setMessageDraft("");
        setEditingMessageId(null);
        return;
      }

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
          Array.from(new Set(conversation.memberAccountIds)).map(
            async (accountId) => ({
              accountId,
              bundles: await listDeviceBundlesForAccount(session, accountId),
            }),
          ),
        );
        const recipientDevices = bundleLists
          .flatMap((entry) => entry.bundles)
          .filter((bundle) => bundle.deviceId !== session.deviceId);

        if (recipientDevices.length === 0) {
          throw new Error(
            "No member devices are registered for this encrypted group yet.",
          );
        }

        let attachment: GroupThreadMessage["attachment"] | null = null;
        const attachmentIds: string[] = [];

        if (pendingAttachment) {
          const attachmentFile =
            await loadPendingAttachmentFile(pendingAttachment);
          const fileBytes = await attachmentFile.bytes();

          if (fileBytes.byteLength > MAX_ATTACHMENT_BYTES) {
            throw new Error(
              "That photo exceeds the 20 MB beta attachment limit.",
            );
          }

          const encrypted = encryptAttachmentBytes(fileBytes);
          const ticket = await relayFetch<AttachmentTicket>(
            session,
            "/v1/attachments/ticket",
            {
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
                contentClass: getContentClass(pendingAttachment.mimeType),
                retentionMode: "private_vault",
                protectionProfile: selectedGroup.sensitiveMediaDefault
                  ? "sensitive_media"
                  : "standard",
              }),
            },
          );

          await uploadAttachmentBytes(
            ticket.uploadUrl,
            "application/octet-stream",
            encrypted.ciphertext,
          );

          attachment = {
            id: ticket.attachmentId,
            downloadUrl: "",
            fileName: pendingAttachment.fileName,
            mimeType: pendingAttachment.mimeType,
            byteLength: fileBytes.byteLength,
            contentClass: getContentClass(pendingAttachment.mimeType),
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

        await relayFetch<{ acceptedEnvelopeIds: string[] }>(
          session,
          "/v1/messages/batch",
          {
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
          },
        );

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
          const attachmentFile =
            await loadPendingAttachmentFile(pendingAttachment);
          const fileBytes = await attachmentFile.bytes();

          if (fileBytes.byteLength > MAX_ATTACHMENT_BYTES) {
            throw new Error(
              "That photo exceeds the 20 MB beta attachment limit.",
            );
          }

          const ticket = await relayFetch<AttachmentTicket>(
            session,
            "/v1/attachments/ticket",
            {
              method: "POST",
              body: JSON.stringify({
                fileName: pendingAttachment.fileName,
                mimeType: pendingAttachment.mimeType,
                byteLength: fileBytes.byteLength,
                conversationId: selectedGroup.id,
                conversationEpoch: selectedGroup.epoch,
                contentClass: getContentClass(pendingAttachment.mimeType),
                retentionMode: "private_vault",
                protectionProfile: selectedGroup.sensitiveMediaDefault
                  ? "sensitive_media"
                  : "standard",
              }),
            },
          );

          await uploadAttachmentBytes(
            ticket.uploadUrl,
            pendingAttachment.mimeType,
            fileBytes.buffer.slice(
              fileBytes.byteOffset,
              fileBytes.byteOffset + fileBytes.byteLength,
            ),
          );

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
      if (!overrideText) setMessageDraft("");
      setPendingAttachment(null);

      if (db) {
        await saveCachedGroupMessages(db, selectedGroup.id, nextThreadMessages);
        refreshConversationCatalog();

        if (createdMessage.attachment) {
          await persistVaultMediaRecord(
            db,
            createdMessage,
            profile?.displayName ?? deviceLabel,
          );
          setVaultCount(await countVaultItems(db));
        }
      }
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Message failed to send",
        body:
          error instanceof Error
            ? error.message
            : "Unable to send this message right now.",
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function updatePrivacyDefaults<K extends keyof PrivacyDefaults>(
    key: K,
    value: PrivacyDefaults[K],
  ) {
    setPrivacyDefaults((current) => ({ ...current, [key]: value }));

    if (!db) {
      return;
    }

    await savePrivacyDefault(
      db,
      key,
      typeof value === "boolean" ? (value ? "1" : "0") : value,
    );
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

  function handleMessageAction(messageId: string, action: ContextMenuAction) {
    if (action.kind === "edit") {
      const msg = threadMessages.find((m) => m.id === messageId);
      if (msg?.text) {
        setMessageDraft(msg.text);
        setEditingMessageId(messageId);
      }
    } else if (action.kind === "delete") {
      setThreadMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
    // "copy" is handled inside MessageBubble via Clipboard
  }

  function handleToggleConversationArchived(conversationId: string) {
    const preference = getConversationPreference(conversationId);
    const nextArchived = !preference.isArchived;

    updateConversationPreference(conversationId, {
      isArchived: nextArchived,
    });

    if (nextArchived && selectedConversationId === conversationId) {
      setSelectedConversationId(null);
    }
  }

  function handleToggleConversationPinned(conversationId: string) {
    const preference = getConversationPreference(conversationId);

    updateConversationPreference(conversationId, {
      isPinned: !preference.isPinned,
    });
  }

  function handleToggleConversationMuted(conversationId: string) {
    const preference = getConversationPreference(conversationId);

    updateConversationPreference(conversationId, {
      isMuted: !preference.isMuted,
    });
  }

  async function handleUpdateGroup(title: string, sensitiveMedia: boolean) {
    if (!session || !selectedGroup) return;
    await relayFetch<{ updated: boolean }>(
      session,
      `/v1/groups/${selectedGroup.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title, sensitiveMediaDefault: sensitiveMedia }),
      },
    );
    // Refresh groups list so the title change reflects in ChatList
    const nextGroups = await relayFetch<GroupMembershipSummary[]>(
      session,
      "/v1/groups",
    );
    setGroups(nextGroups);
    if (db) await saveCachedGroups(db, session.accountId, nextGroups);
  }

  async function handleCreateInvite(): Promise<GroupInviteRecord | null> {
    if (!session || !selectedGroup) return null;
    try {
      return await relayFetch<GroupInviteRecord>(
        session,
        `/v1/groups/${selectedGroup.id}/invites`,
        {
          method: "POST",
          body: JSON.stringify({ maxUses: 1, expiresInHours: 24 * 7 }),
        },
      );
    } catch {
      return null;
    }
  }

  async function handleChangeAvatar() {
    if (!session) return;
    setIsUploadingAvatar(true);
    setSessionMessage(null);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Photo access is still blocked",
          body: "Allow gallery access so EmberChamber can update your profile picture.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      const squareEdge =
        typeof asset.width === "number" && typeof asset.height === "number"
          ? Math.min(asset.width, asset.height)
          : 0;
      const avatarManipulations: ImageManipulator.Action[] = squareEdge
        ? [
            {
              crop: {
                originX: Math.floor((asset.width - squareEdge) / 2),
                originY: Math.floor((asset.height - squareEdge) / 2),
                width: squareEdge,
                height: squareEdge,
              },
            },
            { resize: { width: 400, height: 400 } },
          ]
        : [{ resize: { width: 400 } }];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        avatarManipulations,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const file = new ExpoFile(manipulated.uri);
      const fileBytes = await file.bytes();
      const mimeType = "image/jpeg";

      const ticket = await relayFetch<AttachmentTicket>(
        session,
        "/v1/attachments/ticket",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: `avatar-${Date.now()}.jpg`,
            mimeType,
            byteLength: fileBytes.byteLength,
            contentClass: "image",
            retentionMode: "private_vault",
            protectionProfile: "standard",
            encryptionMode: "none",
          }),
        },
      );

      await uploadAttachmentBytes(
        ticket.uploadUrl,
        mimeType,
        fileBytes.buffer.slice(
          fileBytes.byteOffset,
          fileBytes.byteOffset + fileBytes.byteLength,
        ),
      );

      await relayFetch<MeProfile>(session, "/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarAttachmentId: ticket.attachmentId }),
      });

      const nextProfile = await relayFetch<MeProfile>(session, "/v1/me");
      setProfile(nextProfile);
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Avatar upload failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to update profile picture.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleOpenMembers() {
    if (!session || !selectedGroup) return;
    setIsLoadingMembers(true);
    setGroupMembers([]);
    try {
      const members = await relayFetch<GroupMember[]>(
        session,
        `/v1/groups/${selectedGroup.id}/members`,
      );
      setGroupMembers(members);
    } catch {
      // Non-fatal – roster stays empty
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleLoadMemberNote(
    accountId: string,
  ): Promise<string | null> {
    if (!db) return null;
    const { privateNote } = await loadContactLabel(db, accountId);
    return privateNote;
  }

  async function handleSaveMemberNote(accountId: string, note: string) {
    if (!db) return;
    const label =
      groupMembers.find((m) => m.accountId === accountId)?.displayName ??
      accountId;
    await saveContactLabel(db, accountId, label, note || null);
  }

  async function handleOpenDm(targetAccountId: string, displayName: string) {
    if (!session) return;
    setIsOpeningDm(true);
    try {
      type DmDescriptor = {
        id: string;
        epoch: number;
        historyMode: string;
        createdAt: string;
      };
      const dm = await relayFetch<DmDescriptor>(session, "/v1/dm/open", {
        method: "POST",
        body: JSON.stringify({ peerAccountId: targetAccountId }),
      });

      // Build a synthetic GroupMembershipSummary so the existing conversation
      // screen can render the DM without changes to the chat list data model.
      const existing = groups.find((g) => g.id === dm.id);
      if (!existing) {
        const dmEntry: GroupMembershipSummary = {
          id: dm.id,
          title: displayName,
          epoch: dm.epoch,
          historyMode: "device_encrypted",
          memberCount: 2,
          memberCap: 2,
          myRole: "member",
          sensitiveMediaDefault: false,
          allowMemberInvites: false,
          inviteFreezeEnabled: false,
          canCreateInvites: false,
          canManageMembers: false,
          joinRuleText: null,
          createdAt: dm.createdAt,
          updatedAt: dm.createdAt,
        };
        setGroups((prev) => [dmEntry, ...prev.filter((g) => g.id !== dm.id)]);
      }

      setSelectedConversationId(dm.id);
      setThreadMessages([]);
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Could not open DM",
        body: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsOpeningDm(false);
    }
  }

  function handleSendContactRequest(
    targetAccountId: string,
    displayName: string,
  ) {
    // Prepopulate a DM with a contact intro draft
    void handleOpenDm(targetAccountId, displayName).then(() => {
      setMessageDraft("Hey! I'd like to connect with you. 👋");
    });
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
        error instanceof Error
          ? error.message
          : "Profile setup failed. Try again.",
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  // ---- render ----

  const showEntryChrome = !session || profileSetupActive;
  const heroSignals = !session ? onboardingHeroSignals : [];

  if (isBooting) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.loadingScreen}
          edges={["top", "right", "bottom", "left"]}
        >
          <ActivityIndicator size="large" color={theme.colors.textSoft} />
          <Text style={styles.loadingText}>
            Preparing local device storage…
          </Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.screen}
        edges={["top", "right", "bottom", "left"]}
      >
        {showEntryChrome ? (
          <>
            <View pointerEvents="none" style={styles.backgroundOrbTop} />
            <View pointerEvents="none" style={styles.backgroundOrbLeft} />
            <View pointerEvents="none" style={styles.backgroundOrbRight} />
          </>
        ) : null}
        <KeyboardAvoidingView
          style={styles.keyboardShell}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {showEntryChrome ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroCard}>
                <View pointerEvents="none" style={styles.heroGlow} />
                <View style={styles.brandRow}>
                  <View style={styles.brandMark}>
                    <Text style={styles.brandMarkText}>EC</Text>
                  </View>
                  <View style={styles.brandCopy}>
                    <Text style={styles.eyebrow}>
                      {!session ? "Android beta" : "Profile setup"}
                    </Text>
                    <Text style={styles.brandName}>EmberChamber</Text>
                  </View>
                </View>
                <Text style={styles.title}>
                  {!session
                    ? "Get this phone into your chats fast"
                    : "Choose the name your circles will see"}
                </Text>
                <Text style={styles.subtitle}>
                  {!session
                    ? "Keep onboarding focused on the next action only: name this phone, confirm adults-only access, and finish sign-in from your inbox or a trusted device."
                    : "Pick the display name that should appear in trusted-circle conversations on this device."}
                </Text>
                {!session ? (
                  <View style={styles.heroSignalRow}>
                    {heroSignals.map((signal) => (
                      <View key={signal} style={styles.heroSignalChip}>
                        <Text style={styles.heroSignalText}>{signal}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
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
                  invitePreview={invitePreview}
                  invitePreviewError={invitePreviewError}
                  isPreviewingInvite={isPreviewingInvite}
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
                  onPreviewInvite={() => void previewInvite()}
                  deviceLinkQrValue={deviceLinkQrValue}
                  deviceLinkStatus={deviceLinkStatus}
                  deviceLinkMessage={deviceLinkMessage}
                  isWorkingDeviceLink={isWorkingDeviceLink}
                  onShowDeviceLinkQr={() => void beginTargetDeviceLink()}
                  onScanDeviceLinkQr={(payload) => scanDeviceLinkQr(payload)}
                  onResetDeviceLink={resetDeviceLinkState}
                />
              ) : (
                <ProfileSetupScreen
                  sessionMessage={sessionMessage}
                  profileSetupName={profileSetupName}
                  setProfileSetupName={setProfileSetupName}
                  profileSetupError={profileSetupError}
                  setProfileSetupError={setProfileSetupError}
                  isSubmittingProfile={isSubmittingProfile}
                  onSubmit={() => void submitProfileSetup()}
                />
              )}

              {!session ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Trust boundary</Text>
                  {onboardingAssurances.map((item) => (
                    <Text key={item} style={styles.bullet}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : !isMainShellReady ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={theme.colors.textSoft} />
              <Text style={styles.emptyStateTitle}>Restoring workspace</Text>
              <Text style={styles.emptyStateBody}>
                Loading your last section and conversation on this device.
              </Text>
            </View>
          ) : (
            <MainScreen
              session={session!}
              profile={profile}
              contactCard={contactCard}
              groups={groups}
              conversationPreviews={conversationPreviews}
              conversationPreferences={conversationPreferences}
              unreadCounts={unreadConversationCounts}
              inviteFocusToken={inviteFocusToken}
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
              sessions={sessions}
              isLoadingSessions={isLoadingSessions}
              sessionsError={sessionsError}
              onRefreshSessions={() => {
                if (sessionRef.current) {
                  void refreshSignedInSessions(sessionRef.current);
                }
              }}
              editingMessageId={editingMessageId}
              isUploadingAvatar={isUploadingAvatar}
              unreadIds={unreadConversationIds}
              onSignOut={() => void signOut()}
              onShowDeviceLinkQr={() => void beginSourceDeviceLink()}
              onScanDeviceLinkQr={(payload) => scanDeviceLinkQr(payload)}
              onApproveDeviceLink={() => void approveDeviceLink()}
              onResetDeviceLink={resetDeviceLinkState}
              onPreviewInvite={() => void previewInvite()}
              onAcceptInvite={() => void acceptInvite()}
              onPickPhoto={() => void pickPhoto()}
              onTakePhoto={() => void takePhoto()}
              onPickFile={() => void pickFile()}
              onPickLocation={(choice) => void pickLocation(choice)}
              onSendRawText={(text) => void sendMessage(text)}
              onSendMessage={() => void sendMessage()}
              onUpdatePrivacy={updatePrivacyDefaults}
              onImageError={handleImageError}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setMessageDraft("");
              }}
              onMessageAction={handleMessageAction}
              onUpdateGroup={handleUpdateGroup}
              onCreateInvite={handleCreateInvite}
              onChangeAvatar={() => void handleChangeAvatar()}
              onToggleConversationArchived={handleToggleConversationArchived}
              onToggleConversationPinned={handleToggleConversationPinned}
              onToggleConversationMuted={handleToggleConversationMuted}
              groupMembers={groupMembers}
              isLoadingMembers={isLoadingMembers}
              isOpeningDm={isOpeningDm}
              onOpenMembers={() => void handleOpenMembers()}
              onLoadMemberNote={handleLoadMemberNote}
              onSaveMemberNote={handleSaveMemberNote}
              onOpenDm={handleOpenDm}
              onSendContactRequest={handleSendContactRequest}
              initialShellState={mainShellState}
              onPersistShellState={persistMainShellState}
              restoredConversationAnchorId={restoredConversationAnchorId}
              onPersistConversationAnchor={persistConversationAnchor}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
