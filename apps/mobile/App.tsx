import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import * as SQLite from "expo-sqlite";
import * as SystemUI from "expo-system-ui";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  applyConversationTypingEvent,
  createDeviceLinkToken,
  encodeDeviceLinkQrPayload,
  encryptAttachmentBytes,
  encryptConversationPayload,
  parseDeviceLinkQrPayload,
  pruneConversationTypingIndicators,
  relayOriginsMatch,
  type ConversationSocketEvent,
  type ConversationTypingIndicatorMap,
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
  extractCompletionTokenFromUrl,
  isDefaultDisplayName,
  isLegacySuggestedDeviceLabel,
  isValidEmail,
  makeOpaqueToken,
  normalizeInviteReference,
  suggestMobileDeviceLabel,
} from "./src/lib/utils";
import {
  groupThreadMessageMatchesId,
  groupThreadMessageStableId,
} from "./src/lib/messageIdentity";
import {
  bootstrapLocalStore,
  countVaultItems,
  loadCachedGroupMessages,
  loadCachedGroups,
  loadContactLabel,
  loadPrivacyDefaults,
  persistVaultMediaRecord,
  saveContactLabel,
  savePrivacyDefault,
  saveCachedGroupMessages,
  saveCachedGroups,
} from "./src/lib/db";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from "./src/lib/session";
import {
  completeMagicLinkRequest,
  requestRelaySessionRefresh,
  startMagicLinkRequest,
} from "./src/lib/authApi";
import {
  claimDeviceLinkRequest,
  completeDeviceLinkRequest,
  fetchDeviceLinkStatusRequest,
} from "./src/lib/deviceLinkApi";
import { previewGroupInviteRequest } from "./src/lib/inviteApi";
import {
  getRelayOrigin as getMobileRelayOrigin,
  relayFetch as relayFetchRequest,
} from "./src/lib/relayClient";
import {
  appSecurityCapability,
  secureStorageCapability,
} from "./src/lib/nativeCapabilities";
import { clearNativePushToken } from "./src/lib/pushService";
import { useConversationCatalog } from "./src/hooks/useConversationCatalog";
import { usePersistedMainShellState } from "./src/hooks/usePersistedMainShellState";
import { useSendMessage } from "./src/hooks/useSendMessage";
import {
  ensureDeviceBundleRegistered as ensureDeviceBundleRegisteredRequest,
  listDeviceBundlesForAccount as listDeviceBundlesForAccountRequest,
  refreshConversationThread as refreshConversationThreadRequest,
  syncEncryptedMailbox as syncEncryptedMailboxRequest,
} from "./src/features/conversations/conversationSync";
import { useNotificationBridge } from "./src/features/notifications/useNotificationBridge";
import { AppBootstrap } from "./src/app/AppBootstrap";
import { AppProviders } from "./src/app/AppProviders";
import { AppShell } from "./src/app/AppShell";
import { theme } from "./src/styles";

const onboardingHeroSignals = [
  "Invite-only onboarding",
  "Adults-only access",
  "Local-first history",
];

type AuthMethod = "magic-link" | "device-link";

type ActiveDeviceLink = {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
};

function compareGroupThreadMessagesByCreatedAt(
  left: GroupThreadMessage,
  right: GroupThreadMessage,
) {
  return (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function mergeGroupThreadMessage(
  messages: GroupThreadMessage[],
  nextMessage: GroupThreadMessage,
) {
  return messages
    .filter((entry) => entry.id !== nextMessage.id)
    .concat(nextMessage)
    .sort(compareGroupThreadMessagesByCreatedAt);
}

function markGroupThreadMessageDeleted(
  messages: GroupThreadMessage[],
  messageId: string,
  deletedAt: string,
) {
  return messages.map((message) => {
    let nextMessage = message;

    if (groupThreadMessageMatchesId(message, messageId)) {
      nextMessage = {
        ...message,
        text: null,
        attachment: null,
        reactions: {},
        deletedAt,
      };
    }

    if (nextMessage.replyTo?.messageId === messageId) {
      nextMessage = {
        ...nextMessage,
        replyTo: {
          ...nextMessage.replyTo,
          text: "Message deleted",
        },
      };
    }

    return nextMessage;
  });
}

function toggleGroupThreadMessageReaction(
  messages: GroupThreadMessage[],
  messageId: string,
  emoji: string,
  accountId: string,
) {
  return messages.map((message) => {
    if (!groupThreadMessageMatchesId(message, messageId)) {
      return message;
    }

    const reactions = { ...(message.reactions ?? {}) };
    const current = new Set(reactions[emoji] ?? []);
    if (current.has(accountId)) {
      current.delete(accountId);
    } else {
      current.add(accountId);
    }

    if (current.size > 0) {
      reactions[emoji] = Array.from(current).sort();
    } else {
      delete reactions[emoji];
    }

    return { ...message, reactions };
  });
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
  const [typingIndicators, setTypingIndicators] =
    useState<ConversationTypingIndicatorMap>({});
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
  const [replyingToMessage, setReplyingToMessage] =
    useState<GroupThreadMessage | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isOpeningDm, setIsOpeningDm] = useState(false);
  const [sessions, setSessions] = useState<SessionDescriptor[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isRevokingSession, setIsRevokingSession] = useState<string | null>(
    null,
  );
  const imageRefreshPendingRef = useRef(false);
  const groupsRef = useRef<GroupMembershipSummary[]>([]);
  const sessionRef = useRef<AuthSession | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const deviceBundleDirectoryRef = useRef(new Map<string, DeviceKeyBundle[]>());
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastTypingPublishAtRef = useRef(0);

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

  async function relayFetch<T>(
    currentSession: AuthSession,
    path: string,
    init?: RequestInit,
    allowRefresh = true,
  ): Promise<T> {
    return relayFetchRequest<T>({
      session: currentSession,
      path,
      init,
      allowRefresh,
      onRefreshSession: refreshRelaySession,
      baseUrl: relayUrl,
    });
  }

  async function refreshRelaySession(currentSession: AuthSession) {
    const { response, body } = await requestRelaySessionRefresh(
      currentSession.refreshToken,
    );

    if (!response.ok || !("accessToken" in body)) {
      setSessionMessage({
        tone: "warning",
        title: "Session refresh failed",
        body:
          "This phone kept its saved session so it can retry refresh instead of losing the only recovery token.",
      });
      return null;
    }

    const nextSession: AuthSession = {
      ...currentSession,
      accessToken: body.accessToken,
      deviceId: body.deviceId,
      sessionId: body.sessionId,
      expiresAt: body.expiresAt ?? currentSession.expiresAt,
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

  async function revokeSignedInSession(sessionId: string) {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    setIsRevokingSession(sessionId);
    try {
      await relayFetch<{ revoked: boolean; sessionId: string }>(
        currentSession,
        `/v1/sessions/${sessionId}`,
        { method: "DELETE" },
      );
      await refreshSignedInSessions(currentSession);
    } catch (error) {
      setSessionsError(
        error instanceof Error
          ? error.message
          : "Unable to revoke that session.",
      );
    } finally {
      setIsRevokingSession(null);
    }
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
      secureStorageCapability.setItem(
        STORAGE_KEYS.deviceLabel,
        normalizedDeviceLabel,
      ),
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
        relayOrigin: getMobileRelayOrigin(relayUrl),
        qrMode: "target_display",
        linkToken,
        requesterLabel: normalizedDeviceLabel,
      });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await secureStorageCapability.setItem(
        STORAGE_KEYS.deviceLabel,
        normalizedDeviceLabel,
      );

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
      if (
        !relayOriginsMatch(getMobileRelayOrigin(relayUrl), parsed.relayOrigin)
      ) {
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
      await secureStorageCapability.setItem(
        STORAGE_KEYS.deviceLabel,
        normalizedDeviceLabel,
      );

      const { response, body } = await claimDeviceLinkRequest({
        qrPayload,
        deviceLabel: normalizedDeviceLabel,
      });
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
    const { response, body } = await completeDeviceLinkRequest({
      linkToken,
      qrMode,
    });
    if (!response.ok || !("accessToken" in body)) {
      throw new Error(body.error ?? "Unable to complete device linking.");
    }

    await persistAuthenticatedSession(body, "device-link");
  }

  async function ensureDeviceBundleRegistered(currentSession: AuthSession) {
    return ensureDeviceBundleRegisteredRequest({
      session: currentSession,
      relayFetch,
      deviceBundleDirectory: deviceBundleDirectoryRef.current,
    });
  }

  async function listDeviceBundlesForAccount(
    currentSession: AuthSession,
    accountId: string,
  ) {
    return listDeviceBundlesForAccountRequest({
      session: currentSession,
      accountId,
      relayFetch,
      deviceBundleDirectory: deviceBundleDirectoryRef.current,
    });
  }

  async function syncEncryptedMailbox(currentSession: AuthSession) {
    return syncEncryptedMailboxRequest({
      db,
      session: currentSession,
      relayFetch,
      deviceBundleDirectory: deviceBundleDirectoryRef.current,
      refreshConversationCatalog,
    });
  }

  async function refreshGroupThread(
    currentSession: AuthSession,
    conversationId: string,
  ) {
    const messages = await refreshConversationThreadRequest({
      db,
      session: currentSession,
      conversationId,
      groups: groupsRef.current,
      relayFetch,
      deviceBundleDirectory: deviceBundleDirectoryRef.current,
      refreshConversationCatalog,
    });
    setThreadMessages(messages);
  }

  // ---- effects ----

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    setReplyingToMessage(null);
  }, [selectedConversationId]);

  useEffect(() => {
    if (
      replyingToMessage &&
      threadMessages.some(
        (message) => message.id === replyingToMessage.id && message.deletedAt,
      )
    ) {
      setReplyingToMessage(null);
    }
  }, [replyingToMessage, threadMessages]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTypingIndicators((current) => pruneConversationTypingIndicators(current));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
    };
  }, []);

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
          secureStorageCapability.getItem(STORAGE_KEYS.email),
          secureStorageCapability.getItem(STORAGE_KEYS.inviteToken),
          secureStorageCapability.getItem(STORAGE_KEYS.deviceLabel),
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
      void appSecurityCapability.allowScreenCapture().catch(() => undefined);
      return;
    }

    void appSecurityCapability.preventScreenCapture().catch(() => undefined);
  }, [privacyDefaults.secureAppSwitcher]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(
      () => undefined,
    );
  }, []);

  useNotificationBridge({
    session,
    relayFetch,
    sessionRef,
    selectedConversationIdRef,
    onSelectConversation: setSelectedConversationId,
    onRefreshRelayHostedConversation: async (conversationId) => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        return;
      }

      await refreshGroupThread(currentSession, conversationId);
    },
    onSyncEncryptedMailbox: async (currentSession) => {
      await syncEncryptedMailbox(currentSession);
    },
    onSessionMessage: setSessionMessage,
  });

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
      setTypingIndicators({});
      return;
    }

    const selectedGroupSummary =
      groups.find((group) => group.id === selectedConversationId) ?? null;
    let cancelled = false;
    setIsLoadingThread(true);
    setTypingIndicators({});
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
          const messages = await refreshConversationThreadRequest({
            db,
            session,
            conversationId: selectedConversationId,
            groups,
            relayFetch,
            deviceBundleDirectory: deviceBundleDirectoryRef.current,
            refreshConversationCatalog,
          });
          if (!cancelled) {
            setThreadMessages(messages);
          }

          if (!cancelled) {
            refreshTimer = setInterval(() => {
              void refreshConversationThreadRequest({
                db,
                session,
                conversationId: selectedConversationId,
                groups,
                relayFetch,
                deviceBundleDirectory: deviceBundleDirectoryRef.current,
                refreshConversationCatalog,
              })
                .then((messages) => {
                  if (
                    cancelled ||
                    selectedConversationIdRef.current !== selectedConversationId
                  ) {
                    return;
                  }
                  setThreadMessages(messages);
                })
                .catch(() => undefined);
            }, 8000);
          }
        } else {
          const messages = await refreshConversationThreadRequest({
            db,
            session,
            conversationId: selectedConversationId,
            groups,
            relayFetch,
            deviceBundleDirectory: deviceBundleDirectoryRef.current,
            refreshConversationCatalog,
          });

          if (!cancelled) {
            setThreadMessages(messages);
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
                    const payload = JSON.parse(event.data) as ConversationSocketEvent;

                    if (payload.type === "message") {
                      const message = payload as GroupThreadMessage;
                      setThreadMessages((prev) => {
                        if (prev.some((entry) => entry.id === message.id)) {
                          return prev;
                        }
                        const next = mergeGroupThreadMessage(prev, message);
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
                          `/v1/conversations/${selectedConversationId}/messages/ack`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              lastReadMessageCreatedAt: message.createdAt,
                            }),
                          },
                        ).catch(() => undefined);
                      }
                    } else if (payload.type === "message_edited") {
                      const { messageId, text, editedAt } = payload;
                      setThreadMessages((prev) => {
                        let changed = false;
                        const next = prev.map((message) => {
                          if (message.id !== messageId) {
                            return message;
                          }
                          changed = true;
                          return { ...message, text, editedAt };
                        });
                        if (changed && db) {
                          saveCachedGroupMessages(
                            db,
                            selectedConversationId,
                            next,
                          ).catch(() => {});
                          refreshConversationCatalog();
                        }
                        return changed ? next : prev;
                      });
                    } else if (payload.type === "message_deleted") {
                      const { messageId, deletedAt } = payload;
                      setThreadMessages((prev) => {
                        const next = markGroupThreadMessageDeleted(
                          prev,
                          messageId,
                          deletedAt,
                        );
                        if (db) {
                          saveCachedGroupMessages(
                            db,
                            selectedConversationId,
                            next,
                          ).catch(() => {});
                          refreshConversationCatalog();
                        }
                        return next;
                      });
                    } else if (payload.type === "message_reaction") {
                      const { messageId, reactions } = payload;
                      setThreadMessages((prev) => {
                        let changed = false;
                        const next = prev.map((message) => {
                          if (message.id !== messageId) {
                            return message;
                          }
                          changed = true;
                          return { ...message, reactions };
                        });
                        if (changed && db) {
                          saveCachedGroupMessages(
                            db,
                            selectedConversationId,
                            next,
                          ).catch(() => {});
                          refreshConversationCatalog();
                        }
                        return changed ? next : prev;
                      });
                    } else if (
                      payload.type === "typing_start" ||
                      payload.type === "typing_stop"
                    ) {
                      setTypingIndicators((current) =>
                        applyConversationTypingEvent(current, payload, {
                          selfAccountId: sessionRef.current?.accountId,
                        }),
                      );
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

  const publishTypingState = useCallback(
    (draftText: string) => {
      const activeSession = sessionRef.current;
      const activeConversationId = selectedConversationIdRef.current;
      const activeGroup = groupsRef.current.find(
        (group) => group.id === activeConversationId,
      );
      if (
        !activeSession ||
        !activeConversationId ||
        activeGroup?.historyMode !== "relay_hosted"
      ) {
        return;
      }

      const isTyping = draftText.trim().length > 0;
      const now = Date.now();

      if (isTyping) {
        if (now - lastTypingPublishAtRef.current > 1200) {
          lastTypingPublishAtRef.current = now;
          void relayFetch<{ published: boolean }>(
            activeSession,
            `/v1/conversations/${activeConversationId}/typing/start`,
            { method: "POST" },
          ).catch(() => undefined);
        }

        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current);
        }
        typingStopTimerRef.current = setTimeout(() => {
          const timerSession = sessionRef.current;
          const timerConversationId = selectedConversationIdRef.current;
          if (!timerSession || !timerConversationId) {
            return;
          }
          void relayFetch<{ published: boolean }>(
            timerSession,
            `/v1/conversations/${timerConversationId}/typing/stop`,
            { method: "POST" },
          ).catch(() => undefined);
        }, 2200);
      } else {
        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }
        void relayFetch<{ published: boolean }>(
          activeSession,
          `/v1/conversations/${activeConversationId}/typing/stop`,
          { method: "POST" },
        ).catch(() => undefined);
      }
    },
    [relayFetch],
  );

  function handleMessageDraftChange(nextDraft: string) {
    setMessageDraft(nextDraft);
    publishTypingState(nextDraft);
  }

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
      const { response, body } = await startMagicLinkRequest({
        email: email.trim(),
        inviteToken: inviteToken.trim() || undefined,
        groupId: bootstrapInvite?.groupId,
        groupInviteToken: bootstrapInvite?.inviteToken,
        deviceLabel: deviceLabel.trim(),
        ageConfirmed18: true,
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
        secureStorageCapability.setItem(STORAGE_KEYS.email, email.trim()),
        secureStorageCapability.setItem(
          STORAGE_KEYS.inviteToken,
          inviteToken.trim(),
        ),
        secureStorageCapability.setItem(
          STORAGE_KEYS.deviceLabel,
          deviceLabel.trim(),
        ),
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
      const { response, body } = await completeMagicLinkRequest({
        completionToken,
        deviceLabel: deviceLabel.trim() || suggestMobileDeviceLabel(),
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
        await clearNativePushToken(session, relayFetch);
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
      const { response, body } = await previewGroupInviteRequest(
        normalized.groupId,
        normalized.inviteToken,
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

  const { sendMessage, sendEncryptedControlMessage, isSendingMessage } =
    useSendMessage({
    session,
    selectedGroup,
    messageDraft,
    pendingAttachment,
    editingMessageId,
    replyingToMessage,
    threadMessages,
    profile,
    deviceLabel,
    db,
    relayFetch,
    listDeviceBundlesForAccount,
    setThreadMessages,
    setMessageDraft,
    setPendingAttachment,
    setEditingMessageId,
    setReplyingToMessage,
    setSessionMessage,
    setVaultCount,
    refreshConversationCatalog,
  });

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

  async function handleResolveAttachmentAccess(
    messageId: string,
    attachment: NonNullable<GroupThreadMessage["attachment"]>,
  ) {
    const activeSession = sessionRef.current ?? session;
    if (!activeSession) {
      throw new Error("You must be signed in to open this attachment.");
    }

    const access = await relayFetch<{
      attachmentId: string;
      downloadUrl: string;
      expiresAt: string;
    }>(activeSession, `/v1/attachments/${attachment.id}/access`);
    const nextAttachment = {
      ...attachment,
      downloadUrl: access.downloadUrl,
    };

    let nextMessagesToCache: GroupThreadMessage[] | null = null;
    let conversationIdToCache: string | null = null;

    setThreadMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        if (
          message.id !== messageId ||
          !message.attachment ||
          message.attachment.id !== attachment.id
        ) {
          return message;
        }

        changed = true;
        conversationIdToCache = message.conversationId;
        return {
          ...message,
          attachment: {
            ...message.attachment,
            downloadUrl: access.downloadUrl,
          },
        };
      });

      if (!changed) {
        return prev;
      }

      nextMessagesToCache = next;
      return next;
    });

    if (db && nextMessagesToCache && conversationIdToCache) {
      await saveCachedGroupMessages(
        db,
        conversationIdToCache,
        nextMessagesToCache,
      );
    }

    return nextAttachment;
  }

  function cacheThreadMessages(
    conversationId: string,
    messages: GroupThreadMessage[],
  ) {
    if (!db) {
      return;
    }

    void saveCachedGroupMessages(db, conversationId, messages)
      .then(() => refreshConversationCatalog())
      .catch(() => undefined);
  }

  function updateThreadMessagesAndCache(
    conversationId: string,
    updater: (messages: GroupThreadMessage[]) => GroupThreadMessage[],
  ) {
    setThreadMessages((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        cacheThreadMessages(conversationId, next);
      }
      return next;
    });
  }

  async function toggleMessageReaction(messageId: string, emoji: string) {
    if (!session || !selectedGroup) {
      return;
    }

    if (selectedGroup.historyMode !== "relay_hosted") {
      const target = threadMessages.find((message) => message.id === messageId);
      const targetClientMessageId = target
        ? groupThreadMessageStableId(target)
        : messageId;

      try {
        await sendEncryptedControlMessage({
          messageType: "reaction",
          targetClientMessageId,
          emoji,
        });
        updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
          toggleGroupThreadMessageReaction(
            messages,
            targetClientMessageId,
            emoji,
            session.accountId,
          ),
        );
      } catch (error) {
        setSessionMessage({
          tone: "error",
          title: "Reaction failed",
          body:
            error instanceof Error
              ? error.message
              : "Unable to update that reaction.",
        });
      }
      return;
    }

    try {
      const result = await relayFetch<{
        updated: boolean;
        messageId: string;
        reactions: Record<string, string[]>;
        updatedAt: string;
      }>(
        session,
        `/v1/groups/${selectedGroup.id}/messages/${messageId}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({ emoji }),
        },
      );
      updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
        messages.map((message) =>
          message.id === result.messageId
            ? { ...message, reactions: result.reactions }
            : message,
        ),
      );
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Reaction failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to update that reaction.",
      });
    }
  }

  async function deleteMessageForEveryone(messageId: string) {
    if (!session || !selectedGroup) {
      return;
    }

    if (selectedGroup.historyMode !== "relay_hosted") {
      const target = threadMessages.find((message) => message.id === messageId);
      if (!target || target.senderAccountId !== session.accountId) {
        return;
      }

      const targetClientMessageId = groupThreadMessageStableId(target);
      const deletedAt = new Date().toISOString();

      try {
        await sendEncryptedControlMessage({
          messageType: "delete",
          targetClientMessageId,
          deletedAt,
        });
        if (replyingToMessage?.id === target.id) {
          setReplyingToMessage(null);
        }
        updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
          markGroupThreadMessageDeleted(
            messages,
            targetClientMessageId,
            deletedAt,
          ),
        );
      } catch (error) {
        setSessionMessage({
          tone: "error",
          title: "Delete failed",
          body:
            error instanceof Error
              ? error.message
              : "Unable to delete that message for everyone.",
        });
      }
      return;
    }

    try {
      const result = await relayFetch<{
        deleted: boolean;
        messageId: string;
        deletedAt: string;
      }>(session, `/v1/groups/${selectedGroup.id}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (replyingToMessage?.id === result.messageId) {
        setReplyingToMessage(null);
      }
      updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
        markGroupThreadMessageDeleted(
          messages,
          result.messageId,
          result.deletedAt,
        ),
      );
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Delete failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to delete that message for everyone.",
      });
    }
  }

  function deleteMessageLocally(messageId: string) {
    const message = threadMessages.find((entry) => entry.id === messageId);
    const conversationId = message?.conversationId ?? selectedConversationId;
    if (!conversationId) {
      return;
    }

    if (replyingToMessage?.id === messageId) {
      setReplyingToMessage(null);
    }
    updateThreadMessagesAndCache(conversationId, (messages) =>
      messages.filter((entry) => entry.id !== messageId),
    );
  }

  function handleMessageAction(messageId: string, action: ContextMenuAction) {
    const msg = threadMessages.find((m) => m.id === messageId);

    switch (action.kind) {
      case "reply":
        if (msg && !msg.deletedAt) {
          setReplyingToMessage(msg);
          setEditingMessageId(null);
        }
        break;
      case "react":
        void toggleMessageReaction(messageId, action.emoji);
        break;
      case "edit":
        if (
          msg?.text &&
          !msg.deletedAt &&
          selectedGroup?.historyMode === "relay_hosted"
        ) {
          setReplyingToMessage(null);
          setMessageDraft(msg.text);
          setEditingMessageId(messageId);
        }
        break;
      case "delete_for_everyone":
        void deleteMessageForEveryone(messageId);
        break;
      case "delete_local":
        deleteMessageLocally(messageId);
        break;
      case "copy":
      case "view":
        break;
    }
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
  const onboardingProps = {
    authMethod,
    setAuthMethod,
    email,
    setEmail,
    inviteToken,
    setInviteToken,
    deviceLabel,
    setDeviceLabel,
    ageConfirmed18,
    setAgeConfirmed18,
    inviteInput,
    setInviteInput,
    invitePreview,
    invitePreviewError,
    isPreviewingInvite,
    inviteFieldVisible,
    setInviteFieldVisible,
    isSending,
    isCompleting,
    challenge,
    errors,
    setErrors,
    formMessage,
    sessionMessage,
    onSubmit: () => void submitMagicLink(),
    onCompleteMagicLink: (token: string) => void completeMagicLink(token),
    onPreviewInvite: () => void previewInvite(),
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    onShowDeviceLinkQr: () => void beginTargetDeviceLink(),
    onScanDeviceLinkQr: (payload: string) => scanDeviceLinkQr(payload),
    onResetDeviceLink: resetDeviceLinkState,
  };
  const profileSetupProps = {
    sessionMessage,
    profileSetupName,
    setProfileSetupName,
    profileSetupError,
    setProfileSetupError,
    isSubmittingProfile,
    onSubmit: () => void submitProfileSetup(),
  };
  async function handleRefreshConversations() {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return;
    }
    try {
      const nextGroups = await relayFetch<GroupMembershipSummary[]>(
        currentSession,
        "/v1/groups",
      );
      setGroups(nextGroups);
      if (db) {
        await saveCachedGroups(db, currentSession.accountId, nextGroups);
      }
      await syncEncryptedMailbox(currentSession);
      refreshConversationCatalog();
    } catch {
      // Pull-to-refresh is best-effort; keep the last good state on failure.
    }
  }

  const mainScreenProps = {
    session: session!,
    profile,
    contactCard,
    groups,
    conversationPreviews,
    conversationPreferences,
    unreadCounts: unreadConversationCounts,
    inviteFocusToken,
    selectedConversationId,
    setSelectedConversationId,
    selectedGroup: selectedGroup ?? null,
    threadMessages,
    typingNames: Object.values(
      pruneConversationTypingIndicators(typingIndicators),
    ).map((entry) => entry.displayName),
    inviteInput,
    setInviteInput,
    invitePreview,
    invitePreviewError,
    messageDraft,
    setMessageDraft: handleMessageDraftChange,
    pendingAttachment,
    setPendingAttachment,
    isLoadingAccount,
    isLoadingThread,
    isPreviewingInvite,
    isAcceptingInvite,
    isPickingPhoto,
    isSendingMessage,
    deviceBundleReady,
    deviceBundleCount,
    deviceBundleError,
    vaultCount,
    privacyDefaults,
    sessionMessage,
    email,
    deviceLabel,
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    isApprovingDeviceLink,
    sessions,
    isLoadingSessions,
    sessionsError,
    isRevokingSession,
    onRefreshSessions: () => {
      if (sessionRef.current) {
        void refreshSignedInSessions(sessionRef.current);
      }
    },
    onRevokeSession: (sessionId: string) =>
      void revokeSignedInSession(sessionId),
    editingMessageId,
    replyingToMessage,
    isUploadingAvatar,
    unreadIds: unreadConversationIds,
    onSignOut: () => void signOut(),
    onShowDeviceLinkQr: () => void beginSourceDeviceLink(),
    onScanDeviceLinkQr: (payload: string) => scanDeviceLinkQr(payload),
    onApproveDeviceLink: () => void approveDeviceLink(),
    onResetDeviceLink: resetDeviceLinkState,
    onPreviewInvite: () => void previewInvite(),
    onAcceptInvite: () => void acceptInvite(),
    onPickPhoto: () => void pickPhoto(),
    onTakePhoto: () => void takePhoto(),
    onPickFile: () => void pickFile(),
    onPickLocation: (choice: LocationChoice) => void pickLocation(choice),
    onSendRawText: (text: string) => void sendMessage(text),
    onSendMessage: () => void sendMessage(),
    onUpdatePrivacy: updatePrivacyDefaults,
    onImageError: handleImageError,
    onResolveAttachmentAccess: handleResolveAttachmentAccess,
    onCancelEdit: () => {
      setEditingMessageId(null);
      setMessageDraft("");
    },
    onCancelReply: () => setReplyingToMessage(null),
    onMessageAction: handleMessageAction,
    onUpdateGroup: handleUpdateGroup,
    onCreateInvite: handleCreateInvite,
    onChangeAvatar: () => void handleChangeAvatar(),
    onToggleConversationArchived: handleToggleConversationArchived,
    onToggleConversationPinned: handleToggleConversationPinned,
    onToggleConversationMuted: handleToggleConversationMuted,
    onRefreshConversations: handleRefreshConversations,
    groupMembers,
    isLoadingMembers,
    isOpeningDm,
    onOpenMembers: () => void handleOpenMembers(),
    onLoadMemberNote: handleLoadMemberNote,
    onSaveMemberNote: handleSaveMemberNote,
    onOpenDm: handleOpenDm,
    onSendContactRequest: handleSendContactRequest,
    initialShellState: mainShellState,
    onPersistShellState: persistMainShellState,
    restoredConversationAnchorId,
    onPersistConversationAnchor: persistConversationAnchor,
  };

  if (isBooting) {
    return (
      <AppProviders showEntryChrome={false}>
        <AppBootstrap />
      </AppProviders>
    );
  }

  return (
    <AppProviders
      showEntryChrome={showEntryChrome}
      oledBackground={privacyDefaults.oledDark}
    >
      <AppShell
        showEntryChrome={showEntryChrome}
        isMainShellReady={isMainShellReady}
        isSignedIn={!!session}
        heroSignals={heroSignals}
        trustBoundaryItems={onboardingAssurances}
        onboardingProps={onboardingProps}
        profileSetupProps={profileSetupProps}
        mainScreenProps={mainScreenProps}
      />
    </AppProviders>
  );
}
