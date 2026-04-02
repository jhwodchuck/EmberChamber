import * as ImagePicker from "expo-image-picker";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type MagicLinkResponse = {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
};

type RelayErrorResponse = {
  error?: string;
  code?: string;
};

type AuthSession = {
  accountId: string;
  deviceId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  passkeyEnrollmentSuggested: boolean;
  bootstrapConversationId?: string;
  bootstrapConversationTitle?: string;
};

type MeProfile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
};

type ContactCard = {
  accountId: string;
  label: string;
  cardToken: string;
  conversationHint?: string;
};

type GroupMembershipSummary = {
  id: string;
  title: string;
  epoch: number;
  memberCount: number;
  memberCap: number;
  myRole: "owner" | "admin" | "member";
  sensitiveMediaDefault: boolean;
  joinRuleText?: string | null;
  allowMemberInvites: boolean;
  inviteFreezeEnabled: boolean;
  canCreateInvites: boolean;
  canManageMembers: boolean;
  createdAt: string;
  updatedAt: string;
};

type GroupThreadMessage = {
  id: string;
  conversationId: string;
  senderAccountId: string;
  senderDisplayName: string;
  kind: "text" | "media" | "system_notice";
  text?: string | null;
  attachment?: {
    id: string;
    downloadUrl: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
    contentClass: "image" | "video" | "audio" | "file";
    retentionMode: "private_vault" | "ephemeral";
    protectionProfile: "sensitive_media" | "standard";
    previewBlurHash?: string | null;
  } | null;
  createdAt: string;
};

type GroupInvitePreview = {
  invite: {
    id: string;
    status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
    expiresAt?: string | null;
    maxUses?: number | null;
    useCount: number;
    note?: string | null;
    inviterDisplayName: string;
  };
  group: {
    id: string;
    title: string;
    memberCount: number;
    memberCap: number;
    joinRuleText?: string | null;
    sensitiveMediaDefault: boolean;
  };
};

type GroupInviteAcceptance = {
  conversationId: string;
  title: string;
  epoch: number;
};

type AttachmentTicket = {
  attachmentId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: string;
  maxBytes: number;
  contentClass: "image" | "video" | "audio" | "file";
  retentionMode: "private_vault" | "ephemeral";
  protectionProfile: "sensitive_media" | "standard";
  previewBlurHash?: string;
};

type DeviceKeyBundle = {
  accountId: string;
  deviceId: string;
  deviceLabel: string;
  uploadedAt: string;
  bundle: {
    identityKeyB64: string;
    signedPrekeyB64: string;
    signedPrekeySignatureB64: string;
    oneTimePrekeysB64: string[];
  };
};

type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  width?: number;
  height?: number;
};

type FormMessage = {
  tone: "error" | "success" | "warning" | "info";
  title: string;
  body: string;
};

type Field = "email" | "inviteToken" | "deviceLabel" | "groupInvite";
type NotificationPreviewMode = "discreet" | "expanded" | "none";

type PrivacyDefaults = {
  notificationPreviewMode: NotificationPreviewMode;
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
};

type InviteReference = {
  groupId: string;
  inviteToken: string;
};

const relayUrl =
  process.env.EXPO_PUBLIC_RELAY_URL?.replace(/\/$/, "") ??
  (__DEV__ ? "http://10.0.2.2:8787" : "https://relay.emberchamber.com");

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const STORAGE_KEYS = {
  email: "emberchamber.auth.v1.email",
  inviteToken: "emberchamber.auth.v1.inviteToken",
  deviceLabel: "emberchamber.auth.v1.deviceLabel",
  session: "emberchamber.auth.v1.session",
} as const;

const defaultPrivacyDefaults: PrivacyDefaults = {
  notificationPreviewMode: "discreet",
  autoDownloadSensitiveMedia: false,
  allowSensitiveExport: false,
  secureAppSwitcher: true,
};

const onboardingSteps = [
  { number: "01", title: "Paste the invite you got", body: "A group invite can bootstrap the account and land you in the right circle." },
  { number: "02", title: "Use the inbox you control", body: "Email stays private and only handles sign-in plus recovery." },
  { number: "03", title: "Send the first photo fast", body: "As soon as the app completes the link, it drops into a thread with a real composer." },
] as const;

const onboardingAssurances = [
  "Email is private and used only for bootstrap and recovery.",
  "The relay moves ciphertext, attachment blobs, and delivery metadata instead of indexing private chat history.",
  "Sensitive-media defaults stay local to this device and can be tightened after the first message is sent.",
] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function suggestMobileDeviceLabel() {
  if (Platform.OS === "android") {
    return "Android phone";
  }

  if (Platform.OS === "ios") {
    return "iPhone";
  }

  return "Mobile device";
}

function makeOpaqueToken() {
  const randomSegment = () => Math.random().toString(36).slice(2, 18);
  const cryptoUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);

  if (cryptoUuid) {
    return `${cryptoUuid().replace(/-/g, "")}${cryptoUuid().replace(/-/g, "")}`;
  }

  return `${Date.now().toString(36)}${randomSegment()}${randomSegment()}${randomSegment()}`;
}

function extractCompletionTokenFromUrl(input: string): string | null {
  try {
    const parsed = new URL(input);
    const token = parsed.searchParams.get("token");
    if (!token) {
      return null;
    }

    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (
      path === "/auth/complete" ||
      (host === "auth" && path === "/complete") ||
      input.toLowerCase().includes("auth/complete")
    ) {
      return token;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeInviteReference(value: string): InviteReference | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const inviteIndex = segments.findIndex((segment) => segment === "invite");
    if (inviteIndex >= 0 && segments.length >= inviteIndex + 3) {
      return {
        groupId: segments[inviteIndex + 1] ?? "",
        inviteToken: segments[inviteIndex + 2] ?? "",
      };
    }

    if (url.host === "invite" && segments.length >= 2) {
      return {
        groupId: segments[0] ?? "",
        inviteToken: segments[1] ?? "",
      };
    }
  } catch {
    // Fall through to raw parsing.
  }

  const slashParts = trimmed.split("/").filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      groupId: slashParts[slashParts.length - 2] ?? "",
      inviteToken: slashParts[slashParts.length - 1] ?? "",
    };
  }

  const colonParts = trimmed.split(":");
  if (colonParts.length === 2) {
    return {
      groupId: colonParts[0] ?? "",
      inviteToken: colonParts[1] ?? "",
    };
  }

  return null;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function deviceBundleStorageKey(deviceId: string) {
  return `emberchamber.auth.v1.deviceBundle.${deviceId}`;
}

function createPlaceholderDeviceBundle() {
  return {
    identityKeyB64: makeOpaqueToken(),
    signedPrekeyB64: makeOpaqueToken(),
    signedPrekeySignatureB64: makeOpaqueToken(),
    oneTimePrekeysB64: Array.from({ length: 12 }, () => makeOpaqueToken()),
  };
}

async function bootstrapLocalStore() {
  const db = await SQLite.openDatabaseAsync("emberchamber.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS relay_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      title TEXT,
      epoch INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_media (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      protection_profile TEXT NOT NULL,
      retention_mode TEXT NOT NULL,
      preview_blur_hash TEXT,
      sender_label TEXT,
      created_at TEXT NOT NULL,
      downloaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_labels (
      account_id TEXT PRIMARY KEY NOT NULL,
      local_label TEXT NOT NULL,
      private_note TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  await Promise.all([
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "notificationPreviewMode",
      defaultPrivacyDefaults.notificationPreviewMode,
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "autoDownloadSensitiveMedia",
      defaultPrivacyDefaults.autoDownloadSensitiveMedia ? "1" : "0",
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "allowSensitiveExport",
      defaultPrivacyDefaults.allowSensitiveExport ? "1" : "0",
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "secureAppSwitcher",
      defaultPrivacyDefaults.secureAppSwitcher ? "1" : "0",
    ),
  ]);

  return db;
}

async function loadPrivacyDefaults(db: SQLite.SQLiteDatabase): Promise<PrivacyDefaults> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM app_preferences WHERE key IN (?, ?, ?, ?)",
    "notificationPreviewMode",
    "autoDownloadSensitiveMedia",
    "allowSensitiveExport",
    "secureAppSwitcher",
  );
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    notificationPreviewMode:
      (values.notificationPreviewMode as NotificationPreviewMode | undefined) ??
      defaultPrivacyDefaults.notificationPreviewMode,
    autoDownloadSensitiveMedia: values.autoDownloadSensitiveMedia === "1",
    allowSensitiveExport: values.allowSensitiveExport === "1",
    secureAppSwitcher: values.secureAppSwitcher !== "0",
  };
}

async function savePrivacyDefault(
  db: SQLite.SQLiteDatabase,
  key: keyof PrivacyDefaults,
  value: string,
) {
  await db.runAsync(
    "INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

async function loadStoredSession() {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
    return null;
  }
}

async function saveStoredSession(session: AuthSession) {
  await SecureStore.setItemAsync(STORAGE_KEYS.session, JSON.stringify(session));
}

async function clearStoredSession() {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
}

async function loadStoredDeviceBundle(deviceId: string) {
  const raw = await SecureStore.getItemAsync(deviceBundleStorageKey(deviceId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DeviceKeyBundle["bundle"];
  } catch {
    await SecureStore.deleteItemAsync(deviceBundleStorageKey(deviceId));
    return null;
  }
}

async function saveStoredDeviceBundle(deviceId: string, bundle: DeviceKeyBundle["bundle"]) {
  await SecureStore.setItemAsync(deviceBundleStorageKey(deviceId), JSON.stringify(bundle));
}

async function persistVaultMediaRecord(
  db: SQLite.SQLiteDatabase,
  message: GroupThreadMessage,
  senderLabel: string,
) {
  if (!message.attachment) {
    return;
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO vault_media (
       id,
       conversation_id,
       file_name,
       mime_type,
       protection_profile,
       retention_mode,
       preview_blur_hash,
       sender_label,
       created_at,
       downloaded_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    message.attachment.id,
    message.conversationId,
    message.attachment.fileName,
    message.attachment.mimeType,
    message.attachment.protectionProfile,
    message.attachment.retentionMode,
    message.attachment.previewBlurHash ?? null,
    senderLabel,
    message.createdAt,
    new Date().toISOString(),
  );
}

async function countVaultItems(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM vault_media");
  return row?.count ?? 0;
}

function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.stepCard}>
      <Text style={styles.stepNumber}>{number}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}

function StatusCard({ tone, title, body, children }: FormMessage & { children?: ReactNode }) {
  return (
    <View
      style={[
        styles.statusCard,
        tone === "warning" && styles.statusCardWarning,
        tone === "error" && styles.statusCardError,
        tone === "success" && styles.statusCardSuccess,
      ]}
    >
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusBody}>{body}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onPress,
}: {
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <View style={styles.toggleTextBlock}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : null]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : null]} />
      </View>
    </Pressable>
  );
}

function MessageBubble({
  message,
  isOwnMessage,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
}) {
  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <Text style={styles.systemMessageText}>{message.text ?? "System notice"}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : null]}>
      <View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : null]}>
        <Text style={styles.messageMeta}>
          {isOwnMessage ? "You" : message.senderDisplayName} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
        {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
        {message.attachment?.contentClass === "image" ? (
          <Image source={{ uri: message.attachment.downloadUrl }} style={styles.messageImage} resizeMode="cover" />
        ) : null}
        {message.attachment ? (
          <Text style={styles.attachmentMeta}>
            {message.attachment.fileName} · {formatBytes(message.attachment.byteLength)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [deviceLabel, setDeviceLabel] = useState(suggestMobileDeviceLabel());
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

  const selectedGroup =
    groups.find((group) => group.id === selectedConversationId) ??
    (session?.bootstrapConversationId
      ? groups.find((group) => group.id === session.bootstrapConversationId) ?? null
      : null);

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
    if (!session) {
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
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingAccount(true);

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
            error instanceof Error ? error.message : "Unable to register this phone's device identity.",
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
        setSessionMessage((current) => {
          if (current?.tone === "error") {
            return current;
          }

          if (session.bootstrapConversationTitle) {
            return {
              tone: "success",
              title: "You are in",
              body: `${session.bootstrapConversationTitle} is ready below. Pick a photo or send a short message now.`,
            };
          }

          return current;
        });
      } catch (error) {
        if (!cancelled) {
          setSessionMessage({
            tone: "error",
            title: "Signed in, but account sync failed",
            body: error instanceof Error ? error.message : "Unable to load account state from the relay.",
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
  }, [session]);

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

    let cancelled = false;
    setIsLoadingThread(true);

    void (async () => {
      try {
        const messages = await relayFetch<GroupThreadMessage[]>(
          session,
          `/v1/groups/${selectedConversationId}/messages?limit=50`,
        );

        if (!cancelled) {
          setThreadMessages(messages);
        }
      } catch (error) {
        if (!cancelled) {
          setSessionMessage({
            tone: "error",
            title: "Unable to load this conversation",
            body: error instanceof Error ? error.message : "Thread sync failed.",
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
    };
  }, [session, selectedConversationId]);

  async function relayFetch<T>(
    currentSession: AuthSession,
    path: string,
    init?: RequestInit,
    allowRefresh = true,
  ): Promise<T> {
    const response = await fetch(`${relayUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${currentSession.accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    const body = (await response.json()) as T & RelayErrorResponse;
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
    const response = await fetch(`${relayUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: currentSession.refreshToken,
      }),
    });

    const body = (await response.json()) as
      | { accessToken: string; deviceId: string; sessionId: string; error?: string }
      | RelayErrorResponse;

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

  async function ensureDeviceBundleRegistered(currentSession: AuthSession) {
    const existingBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );

    if (existingBundles.some((bundle) => bundle.deviceId === currentSession.deviceId)) {
      return existingBundles;
    }

    const localBundle =
      (await loadStoredDeviceBundle(currentSession.deviceId)) ?? createPlaceholderDeviceBundle();
    await saveStoredDeviceBundle(currentSession.deviceId, localBundle);

    await relayFetch<{ registered: boolean }>(currentSession, "/v1/devices/register", {
      method: "POST",
      body: JSON.stringify(localBundle),
    });

    const confirmedBundles = await relayFetch<DeviceKeyBundle[]>(
      currentSession,
      `/v1/accounts/${currentSession.accountId}/device-bundles`,
    );

    if (!confirmedBundles.some((bundle) => bundle.deviceId === currentSession.deviceId)) {
      throw new Error("This phone's device identity did not register correctly.");
    }

    return confirmedBundles;
  }

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
        body: "This bootstrap needs a valid email, a readable device label, and either a beta invite token or a valid group invite for new accounts.",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${relayUrl}/v1/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          inviteToken: inviteToken.trim() || undefined,
          groupId: bootstrapInvite?.groupId,
          groupInviteToken: bootstrapInvite?.inviteToken,
          deviceLabel: deviceLabel.trim(),
        }),
      });

      const body = ((await response.json()) as MagicLinkResponse & RelayErrorResponse) ?? {};
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
      const response = await fetch(`${relayUrl}/v1/auth/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          completionToken,
          deviceLabel: deviceLabel.trim() || suggestMobileDeviceLabel(),
        }),
      });

      const body = ((await response.json()) as AuthSession & RelayErrorResponse) ?? {};
      if (!response.ok || !("accessToken" in body)) {
        throw new Error(body.error ?? "Unable to complete the magic link");
      }

      await saveStoredSession(body);
      setSession(body);
      setChallenge(null);
      setSessionMessage({
        tone: "success",
        title: body.bootstrapConversationTitle ? "Signed in and thread ready" : "Session ready",
        body: body.bootstrapConversationTitle
          ? `${body.bootstrapConversationTitle} should appear below as soon as account sync finishes.`
          : "This phone now has a relay session. Join or create a trusted circle to send your first message.",
      });
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
    await clearStoredSession();
    setSession(null);
    setProfile(null);
    setContactCard(null);
    setGroups([]);
    setThreadMessages([]);
    setPendingAttachment(null);
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
      const response = await fetch(
        `${relayUrl}/v1/groups/${normalized.groupId}/invites/${encodeURIComponent(normalized.inviteToken)}/preview`,
      );
      const body = ((await response.json()) as GroupInvitePreview & RelayErrorResponse) ?? {};
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
        {
          method: "POST",
        },
      );

      const nextGroups = await relayFetch<GroupMembershipSummary[]>(session, "/v1/groups");
      setGroups(nextGroups);
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
      const fileSize = asset.fileSize ?? 0;
      if (fileSize > MAX_ATTACHMENT_BYTES) {
        setSessionMessage({
          tone: "error",
          title: "That photo is too large",
          body: "Keep the file under 20 MB for the beta relay path.",
        });
        return;
      }

      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        byteLength: fileSize,
        width: asset.width,
        height: asset.height,
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
          headers: {
            "content-type": pendingAttachment.mimeType,
          },
          body: fileBlob,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text();
          throw new Error(uploadError || "Attachment upload failed.");
        }

        attachmentId = ticket.attachmentId;
      }

      const createdMessage = await relayFetch<GroupThreadMessage>(
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

      setThreadMessages((current) => [...current, createdMessage]);
      setMessageDraft("");
      setPendingAttachment(null);

      if (db && createdMessage.attachment) {
        await persistVaultMediaRecord(
          db,
          createdMessage,
          profile?.displayName ?? deviceLabel,
        );
        setVaultCount(await countVaultItems(db));
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

    await savePrivacyDefault(
      db,
      key,
      typeof value === "boolean" ? (value ? "1" : "0") : value,
    );
  }

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#91f3d8" />
        <Text style={styles.loadingText}>Preparing your encrypted local store…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>Android beta</Text>
          <Text style={styles.title}>
            {session ? "Send the first real message from this phone" : "Install to first photo should stay under five minutes"}
          </Text>
          <Text style={styles.subtitle}>
            {session
              ? "This beta now completes sign-in in-app, registers this device identity, and drops into a real group thread with a photo-capable composer."
              : "The shortest path is now invite link, private email, device label, and inbox confirmation handed back into the app."}
          </Text>

          {!session ? (
            <>
              <View style={styles.stepGrid}>
                {onboardingSteps.map((step) => (
                  <StepCard key={step.number} number={step.number} title={step.title} body={step.body} />
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Start with the invite and your inbox</Text>
                <Text style={styles.sectionBody}>
                  A group invite can bootstrap a brand-new beta account. If you only have a beta invite
                  token, add it when needed and keep moving.
                </Text>

                {formMessage ? <StatusCard {...formMessage} /> : null}
                {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Optional group invite link</Text>
                  <TextInput
                    autoCapitalize="none"
                    placeholder="Paste /invite/{groupId}/{token}"
                    placeholderTextColor="#8ba1a3"
                    style={[styles.input, errors.groupInvite ? styles.inputError : null]}
                    value={inviteInput}
                    onChangeText={(value) => {
                      setInviteInput(value);
                      if (errors.groupInvite) {
                        setErrors((current) => ({ ...current, groupInvite: undefined }));
                      }
                    }}
                  />
                  <Text style={styles.helper}>
                    If this is valid, the app can open straight into that group after inbox confirmation.
                  </Text>
                  {errors.groupInvite ? <Text style={styles.errorText}>{errors.groupInvite}</Text> : null}
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Private email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor="#8ba1a3"
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (errors.email) {
                        setErrors((current) => ({ ...current, email: undefined }));
                      }
                    }}
                  />
                  <Text style={styles.helper}>Used only for bootstrap and recovery.</Text>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {inviteFieldVisible ? (
                  <View style={styles.fieldBlock}>
                    <View style={styles.inlineLabelRow}>
                      <Text style={styles.label}>Beta invite token</Text>
                      <Pressable
                        onPress={() => {
                          setInviteFieldVisible(false);
                          setInviteToken("");
                          setErrors((current) => ({ ...current, inviteToken: undefined }));
                        }}
                      >
                        <Text style={styles.inlineAction}>Hide</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      autoCapitalize="none"
                      placeholder="Paste your beta invite token"
                      placeholderTextColor="#8ba1a3"
                      style={[styles.input, errors.inviteToken ? styles.inputError : null]}
                      value={inviteToken}
                      onChangeText={(value) => {
                        setInviteToken(value);
                        if (errors.inviteToken) {
                          setErrors((current) => ({ ...current, inviteToken: undefined }));
                        }
                      }}
                    />
                    <Text style={styles.helper}>Only needed when the relay asks for broader beta access.</Text>
                    {errors.inviteToken ? <Text style={styles.errorText}>{errors.inviteToken}</Text> : null}
                  </View>
                ) : (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>No beta token on hand?</Text>
                    <Text style={styles.infoBody}>
                      Returning users can continue with email alone. Some new accounts can also
                      bootstrap directly from a valid group invite.
                    </Text>
                    <Pressable onPress={() => setInviteFieldVisible(true)}>
                      <Text style={styles.inlineAction}>Add beta invite token</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Device label</Text>
                  <TextInput
                    placeholder="Android phone"
                    placeholderTextColor="#8ba1a3"
                    style={[styles.input, errors.deviceLabel ? styles.inputError : null]}
                    value={deviceLabel}
                    onChangeText={(value) => {
                      setDeviceLabel(value);
                      if (errors.deviceLabel) {
                        setErrors((current) => ({ ...current, deviceLabel: undefined }));
                      }
                    }}
                  />
                  <Text style={styles.helper}>
                    This label appears in session review, recovery prompts, and device linking later.
                  </Text>
                  {errors.deviceLabel ? <Text style={styles.errorText}>{errors.deviceLabel}</Text> : null}
                </View>

                <Pressable
                  disabled={isSending || isCompleting || !email.trim() || !deviceLabel.trim()}
                  onPress={() => void submitMagicLink()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isSending) && styles.primaryButtonPressed,
                    (isSending || isCompleting || !email.trim() || !deviceLabel.trim()) &&
                      styles.primaryButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {isSending ? "Sending magic link…" : "Continue"}
                  </Text>
                </Pressable>
              </View>

              {challenge ? (
                <StatusCard
                  tone="success"
                  title="Check your inbox"
                  body="Open the email link on this phone. If it lands in the browser first, the completion page should hand the token back into EmberChamber."
                >
                  {challenge.debugCompletionToken ? (
                    <Pressable
                      style={styles.devButton}
                      onPress={() => void completeMagicLink(challenge.debugCompletionToken!)}
                    >
                      <Text style={styles.devButtonLabel}>Dev-only: complete on this phone now</Text>
                    </Pressable>
                  ) : null}
                </StatusCard>
              ) : null}
            </>
          ) : (
            <>
              {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Account ready</Text>
                {isLoadingAccount ? (
                  <View style={styles.inlineLoadingRow}>
                    <ActivityIndicator size="small" color="#91f3d8" />
                    <Text style={styles.helper}>Loading profile, device state, and current groups…</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.metricRow}>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Display name</Text>
                        <Text style={styles.metricValueText}>
                          {profile?.displayName ?? "Loading…"}
                        </Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Current device</Text>
                        <Text style={styles.metricValueText}>{deviceLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.helper}>
                      {(profile?.email ?? email) || "This account email is loading."}
                    </Text>

                    {contactCard ? (
                      <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Contact card ready</Text>
                        <Text style={styles.infoBody}>
                          Share this token later by QR or copy flow. The immediate goal is that this
                          phone now has both a relay session and a device identity.
                        </Text>
                        <Text selectable style={styles.codeText}>
                          {contactCard.cardToken}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.metricRow}>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Device identity</Text>
                        <Text style={styles.metricValueText}>
                          {deviceBundleReady ? "Registered" : "Pending"}
                        </Text>
                        <Text style={styles.helper}>
                          {deviceBundleCount} visible bundle{deviceBundleCount === 1 ? "" : "s"} on the relay.
                        </Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Current groups</Text>
                        <Text style={styles.metricValue}>{groups.length}</Text>
                      </View>
                    </View>

                    {deviceBundleError ? (
                      <Text style={styles.errorText}>{deviceBundleError}</Text>
                    ) : null}

                    <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
                      <Text style={styles.secondaryButtonLabel}>Sign out</Text>
                    </Pressable>
                  </>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Thread picker</Text>
                <Text style={styles.sectionBody}>
                  Pick a group and send the first real message from this phone. If you do not have one
                  yet, paste an invite right below.
                </Text>
                {groups.length ? (
                  <View style={styles.groupSelectorRow}>
                    {groups.map((group) => (
                      <Pressable
                        key={group.id}
                        style={[
                          styles.groupSelectorChip,
                          selectedConversationId === group.id ? styles.groupSelectorChipActive : null,
                        ]}
                        onPress={() => {
                          setSelectedConversationId(group.id);
                          setPendingAttachment(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.groupSelectorLabel,
                            selectedConversationId === group.id ? styles.groupSelectorLabelActive : null,
                          ]}
                        >
                          {group.title}
                        </Text>
                        <Text style={styles.groupSelectorMeta}>
                          {group.memberCount}/{group.memberCap}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.helper}>
                    No groups attached yet. Paste a group invite below to get into a conversation fast.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Join a group invite</Text>
                <Text style={styles.sectionBody}>
                  Paste a trusted invite here to attach a new circle to this account without leaving the app.
                </Text>
                <TextInput
                  autoCapitalize="none"
                  placeholder="Paste an /invite/{groupId}/{token} link"
                  placeholderTextColor="#8ba1a3"
                  style={styles.input}
                  value={inviteInput}
                  onChangeText={setInviteInput}
                />
                <View style={styles.buttonRow}>
                  <Pressable
                    style={[
                      styles.secondaryButton,
                      styles.buttonRowButton,
                      isPreviewingInvite ? styles.primaryButtonDisabled : null,
                    ]}
                    onPress={() => void previewInvite()}
                    disabled={isPreviewingInvite}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {isPreviewingInvite ? "Previewing…" : "Preview invite"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      styles.buttonRowButton,
                      isAcceptingInvite ? styles.primaryButtonPressed : null,
                    ]}
                    onPress={() => void acceptInvite()}
                    disabled={isAcceptingInvite || !inviteInput.trim()}
                  >
                    <Text style={styles.primaryButtonLabel}>
                      {isAcceptingInvite ? "Joining…" : "Join group"}
                    </Text>
                  </Pressable>
                </View>
                {invitePreviewError ? <Text style={styles.errorText}>{invitePreviewError}</Text> : null}
                {invitePreview ? (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{invitePreview.group.title}</Text>
                    <Text style={styles.infoBody}>
                      Issued by {invitePreview.invite.inviterDisplayName}. Members{" "}
                      {invitePreview.group.memberCount}/{invitePreview.group.memberCap}. Status{" "}
                      {invitePreview.invite.status}.
                    </Text>
                    {invitePreview.group.joinRuleText ? (
                      <Text style={styles.helper}>{invitePreview.group.joinRuleText}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {selectedGroup ? `${selectedGroup.title}` : "Conversation"}
                </Text>
                <Text style={styles.sectionBody}>
                  {selectedGroup
                    ? "This is the first real messaging surface on Android: recent thread history, photo upload, and send."
                    : "Join or select a group to unlock the composer."}
                </Text>

                {selectedGroup ? (
                  <>
                    <View style={styles.threadMetaRow}>
                      <Text style={styles.threadMetaText}>
                        Role {selectedGroup.myRole}. Members {selectedGroup.memberCount}/{selectedGroup.memberCap}.
                      </Text>
                      <Text style={styles.threadMetaText}>
                        Sensitive media default {selectedGroup.sensitiveMediaDefault ? "on" : "off"}.
                      </Text>
                    </View>

                    {isLoadingThread ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator size="small" color="#91f3d8" />
                        <Text style={styles.helper}>Loading recent messages…</Text>
                      </View>
                    ) : threadMessages.length ? (
                      <View style={styles.threadList}>
                        {threadMessages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.senderAccountId === session.accountId}
                          />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyThreadCard}>
                        <Text style={styles.infoTitle}>No messages yet</Text>
                        <Text style={styles.infoBody}>
                          Send a short note or attach a photo to make this phone's first delivery path real.
                        </Text>
                      </View>
                    )}

                    {pendingAttachment ? (
                      <View style={styles.pendingAttachmentCard}>
                        <View style={styles.pendingAttachmentHeader}>
                          <Text style={styles.infoTitle}>Ready to send</Text>
                          <Pressable onPress={() => setPendingAttachment(null)}>
                            <Text style={styles.inlineAction}>Remove</Text>
                          </Pressable>
                        </View>
                        <Image
                          source={{ uri: pendingAttachment.uri }}
                          style={styles.pendingAttachmentImage}
                          resizeMode="cover"
                        />
                        <Text style={styles.helper}>
                          {pendingAttachment.fileName} ·{" "}
                          {pendingAttachment.byteLength
                            ? formatBytes(pendingAttachment.byteLength)
                            : "size will be confirmed on upload"}
                        </Text>
                      </View>
                    ) : null}

                    <TextInput
                      multiline
                      placeholder="Write a short message"
                      placeholderTextColor="#8ba1a3"
                      style={[styles.input, styles.composerInput]}
                      value={messageDraft}
                      onChangeText={setMessageDraft}
                    />

                    <View style={styles.buttonRow}>
                      <Pressable
                        style={[
                          styles.secondaryButton,
                          styles.buttonRowButton,
                          isPickingPhoto ? styles.primaryButtonDisabled : null,
                        ]}
                        onPress={() => void pickPhoto()}
                        disabled={isPickingPhoto}
                      >
                        <Text style={styles.secondaryButtonLabel}>
                          {isPickingPhoto ? "Opening gallery…" : "Pick photo"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.primaryButton,
                          styles.buttonRowButton,
                          (!messageDraft.trim() && !pendingAttachment) || isSendingMessage
                            ? styles.primaryButtonDisabled
                            : null,
                        ]}
                        onPress={() => void sendMessage()}
                        disabled={(!messageDraft.trim() && !pendingAttachment) || isSendingMessage}
                      >
                        <Text style={styles.primaryButtonLabel}>
                          {isSendingMessage ? "Sending…" : "Send"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={styles.helper}>
                    Finish sign-in with a group invite or join a circle above. The fastest first-message path is a shared group thread, not a blank inbox.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Local private vault</Text>
                <Text style={styles.sectionBody}>
                  Sent sensitive media is now tracked locally so the vault reflects what this phone handled.
                </Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Vault items</Text>
                    <Text style={styles.metricValue}>{vaultCount}</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Export posture</Text>
                    <Text style={styles.metricValue}>
                      {privacyDefaults.allowSensitiveExport ? "Open" : "Locked"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Discreet device defaults</Text>
                <Text style={styles.sectionBody}>
                  These settings stay local and now sit behind the first-message path instead of blocking it.
                </Text>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Notification preview mode</Text>
                  <View style={styles.segmentRow}>
                    {(["discreet", "expanded", "none"] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        style={[
                          styles.segmentButton,
                          privacyDefaults.notificationPreviewMode === mode ? styles.segmentButtonActive : null,
                        ]}
                        onPress={() => void updatePrivacyDefaults("notificationPreviewMode", mode)}
                      >
                        <Text
                          style={[
                            styles.segmentButtonLabel,
                            privacyDefaults.notificationPreviewMode === mode
                              ? styles.segmentButtonLabelActive
                              : null,
                          ]}
                        >
                          {mode}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <ToggleRow
                  title="Auto-download sensitive media"
                  description="Keep this off so intimate media does not silently accumulate on the device."
                  value={privacyDefaults.autoDownloadSensitiveMedia}
                  onPress={() =>
                    void updatePrivacyDefaults(
                      "autoDownloadSensitiveMedia",
                      !privacyDefaults.autoDownloadSensitiveMedia,
                    )
                  }
                />
                <ToggleRow
                  title="Allow sensitive export"
                  description="Keep this off to discourage saving media outside the private vault."
                  value={privacyDefaults.allowSensitiveExport}
                  onPress={() =>
                    void updatePrivacyDefaults(
                      "allowSensitiveExport",
                      !privacyDefaults.allowSensitiveExport,
                    )
                  }
                />
                <ToggleRow
                  title="Secure app switcher"
                  description="Request screenshot and app-switcher protection on supported devices."
                  value={privacyDefaults.secureAppSwitcher}
                  onPress={() =>
                    void updatePrivacyDefaults("secureAppSwitcher", !privacyDefaults.secureAppSwitcher)
                  }
                />
              </View>
            </>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071116",
  },
  keyboardShell: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#071116",
    gap: 12,
  },
  loadingText: {
    color: "#eaf4f4",
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 16,
  },
  eyebrow: {
    color: "#91f3d8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#f7fafc",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
  },
  subtitle: {
    color: "#b6c8cc",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
  },
  stepGrid: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: "#0b171d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#17303a",
    padding: 16,
    gap: 6,
  },
  stepNumber: {
    color: "#91f3d8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  stepTitle: {
    color: "#f7fafc",
    fontSize: 15,
    fontWeight: "600",
  },
  stepBody: {
    color: "#b6c8cc",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#0f1a21",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#17303a",
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: "#f7fafc",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionBody: {
    color: "#b6c8cc",
    fontSize: 14,
    lineHeight: 21,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    color: "#f7fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  inlineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlineAction: {
    color: "#91f3d8",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f3b46",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#081419",
    color: "#f7fafc",
    fontSize: 16,
  },
  composerInput: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  helper: {
    color: "#8ba1a3",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#fda4af",
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f3b46",
    borderStyle: "dashed",
    backgroundColor: "#0a151a",
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: "#f7fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBody: {
    color: "#b6c8cc",
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#91f3d8",
    paddingHorizontal: 16,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonLabel: {
    color: "#06242b",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1f3b46",
    backgroundColor: "#081419",
    paddingHorizontal: 16,
  },
  secondaryButtonLabel: {
    color: "#f7fafc",
    fontSize: 15,
    fontWeight: "600",
  },
  devButton: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f5b4a",
    backgroundColor: "#0c1d18",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  devButtonLabel: {
    color: "#91f3d8",
    fontSize: 13,
    fontWeight: "700",
  },
  bullet: {
    color: "#b6c8cc",
    fontSize: 14,
    lineHeight: 22,
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f3b46",
    backgroundColor: "#0b171d",
    padding: 14,
    gap: 6,
  },
  statusCardWarning: {
    borderColor: "#b8791f",
    backgroundColor: "#2b2210",
  },
  statusCardError: {
    borderColor: "#7f1d1d",
    backgroundColor: "#261113",
  },
  statusCardSuccess: {
    borderColor: "#1f5b4a",
    backgroundColor: "#0d221c",
  },
  statusTitle: {
    color: "#f7fafc",
    fontSize: 15,
    fontWeight: "600",
  },
  statusBody: {
    color: "#b6c8cc",
    fontSize: 13,
    lineHeight: 20,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#17303a",
    backgroundColor: "#0b171d",
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: "#8ba1a3",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#f7fafc",
    fontSize: 22,
    fontWeight: "700",
  },
  metricValueText: {
    color: "#f7fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f3b46",
    backgroundColor: "#081419",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    borderColor: "#91f3d8",
    backgroundColor: "#0f2621",
  },
  segmentButtonLabel: {
    color: "#8ba1a3",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  segmentButtonLabelActive: {
    color: "#91f3d8",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 6,
  },
  toggleTextBlock: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: "#f7fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleDescription: {
    color: "#8ba1a3",
    fontSize: 12,
    lineHeight: 18,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#21353d",
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackOn: {
    backgroundColor: "#1f5b4a",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dbe6e7",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
    backgroundColor: "#91f3d8",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  buttonRowButton: {
    flex: 1,
  },
  codeText: {
    color: "#91f3d8",
    fontSize: 12,
    lineHeight: 18,
  },
  inlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  groupSelectorChip: {
    minWidth: 132,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f3b46",
    backgroundColor: "#081419",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  groupSelectorChipActive: {
    borderColor: "#91f3d8",
    backgroundColor: "#0f2621",
  },
  groupSelectorLabel: {
    color: "#f7fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  groupSelectorLabelActive: {
    color: "#91f3d8",
  },
  groupSelectorMeta: {
    color: "#8ba1a3",
    fontSize: 12,
  },
  threadMetaRow: {
    gap: 4,
  },
  threadMetaText: {
    color: "#8ba1a3",
    fontSize: 12,
    lineHeight: 18,
  },
  threadList: {
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#17303a",
    backgroundColor: "#0b171d",
    padding: 12,
    gap: 6,
  },
  messageBubbleOwn: {
    borderColor: "#1f5b4a",
    backgroundColor: "#0f2621",
  },
  messageMeta: {
    color: "#8ba1a3",
    fontSize: 12,
    fontWeight: "600",
  },
  messageText: {
    color: "#f7fafc",
    fontSize: 15,
    lineHeight: 21,
  },
  attachmentMeta: {
    color: "#8ba1a3",
    fontSize: 12,
    lineHeight: 18,
  },
  messageImage: {
    width: "100%",
    minHeight: 220,
    borderRadius: 14,
    backgroundColor: "#081419",
  },
  systemMessageCard: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "#0b171d",
    borderWidth: 1,
    borderColor: "#17303a",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  systemMessageText: {
    color: "#8ba1a3",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyThreadCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#17303a",
    backgroundColor: "#0b171d",
    padding: 14,
    gap: 6,
  },
  pendingAttachmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f3b46",
    backgroundColor: "#0b171d",
    padding: 12,
    gap: 10,
  },
  pendingAttachmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pendingAttachmentImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#081419",
  },
});
