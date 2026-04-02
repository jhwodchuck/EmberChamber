import * as ImagePicker from "expo-image-picker";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
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
  createPlaceholderDeviceBundle,
  extractCompletionTokenFromUrl,
  isValidEmail,
  makeOpaqueToken,
  normalizeInviteReference,
  suggestMobileDeviceLabel,
} from "./src/lib/utils";
import {
  bootstrapLocalStore,
  countVaultItems,
  loadPrivacyDefaults,
  persistVaultMediaRecord,
  savePrivacyDefault,
} from "./src/lib/db";
import {
  clearStoredSession,
  loadStoredDeviceBundle,
  loadStoredSession,
  saveStoredDeviceBundle,
  saveStoredSession,
} from "./src/lib/session";
import { styles } from "./src/styles";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { MainScreen } from "./src/screens/MainScreen";

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
  const [profileSetupSelfie, setProfileSetupSelfie] = useState<PendingAttachment | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState<string | null>(null);
  const [isPickingSelfie, setIsPickingSelfie] = useState(false);

  const imageRefreshPendingRef = useRef(false);

  const selectedGroup =
    groups.find((group) => group.id === selectedConversationId) ??
    (session?.bootstrapConversationId
      ? groups.find((group) => group.id === session.bootstrapConversationId) ?? null
      : null);

  // ---- relay helpers (stay here because they close over setSession) ----

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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
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

  // ---- effects ----

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
        const [savedEmail, savedInvite, savedDeviceLabel, nextPrivacyDefaults, vaultItems, savedSession, initialUrl, profileSetupDone] =
          await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.email),
            SecureStore.getItemAsync(STORAGE_KEYS.inviteToken),
            SecureStore.getItemAsync(STORAGE_KEYS.deviceLabel),
            loadPrivacyDefaults(nextDb),
            countVaultItems(nextDb),
            loadStoredSession(),
            Linking.getInitialURL(),
            SecureStore.getItemAsync(STORAGE_KEYS.profileSetupComplete),
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
        if (savedSession && !profileSetupDone) {
          setProfileSetupActive(true);
        }
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
      const response = await fetch(`${relayUrl}/v1/auth/start`, {
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
        headers: { "content-type": "application/json" },
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
      const setupDone = await SecureStore.getItemAsync(STORAGE_KEYS.profileSetupComplete);
      if (!setupDone) {
        setProfileSetupActive(true);
      }
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
    setProfileSetupActive(false);
    setProfileSetupName("");
    setProfileSetupSelfie(null);
    setProfileSetupError(null);
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
        { method: "POST" },
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
          headers: { "content-type": pendingAttachment.mimeType },
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
        await persistVaultMediaRecord(db, createdMessage, profile?.displayName ?? deviceLabel);
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

    await savePrivacyDefault(db, key, typeof value === "boolean" ? (value ? "1" : "0") : value);
  }

  function handleImageError(messageId: string) {
    if (imageRefreshPendingRef.current || !session || !selectedConversationId) {
      return;
    }

    imageRefreshPendingRef.current = true;

    void (async () => {
      try {
        const messages = await relayFetch<GroupThreadMessage[]>(
          session,
          `/v1/groups/${selectedConversationId}/messages?limit=50`,
        );
        setThreadMessages(messages);
      } catch {
        // Silently ignore — the user can pull-to-refresh or re-open the thread.
      } finally {
        setTimeout(() => {
          imageRefreshPendingRef.current = false;
        }, 30_000);
      }
    })();
  }

  async function pickSelfie() {
    setIsPickingSelfie(true);
    setProfileSetupError(null);

    try {
      const camPermission = await ImagePicker.requestCameraPermissionsAsync();
      let result: ImagePicker.ImagePickerResult;

      if (camPermission.granted) {
        result = await ImagePicker.launchCameraAsync({
          quality: 0.85,
          allowsEditing: true,
          aspect: [1, 1],
        });
      } else {
        const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!galleryPermission.granted) {
          setProfileSetupError(
            "Camera and gallery access are both blocked. Allow at least one in device settings to add a profile photo.",
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
          allowsEditing: true,
          aspect: [1, 1],
        });
      }

      if (!result.canceled && result.assets.length) {
        const asset = result.assets[0];
        setProfileSetupSelfie({
          uri: asset.uri,
          fileName: asset.fileName ?? `selfie-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          byteLength: asset.fileSize ?? 0,
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      setProfileSetupError(
        error instanceof Error ? error.message : "Unable to open the camera or gallery.",
      );
    } finally {
      setIsPickingSelfie(false);
    }
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

    if (!profileSetupSelfie) {
      setProfileSetupError(
        "Add a profile photo to continue. It stays private and is only shared when you choose.",
      );
      return;
    }

    setIsSubmittingProfile(true);
    setProfileSetupError(null);

    try {
      await relayFetch<MeProfile>(session, "/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: profileSetupName.trim() }),
      });

      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.selfieUri, profileSetupSelfie.uri),
        SecureStore.setItemAsync(STORAGE_KEYS.profileSetupComplete, "1"),
      ]);

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
            {session
              ? "Send the first real message from this phone"
              : "Install to first trusted-circle message should stay under five minutes"}
          </Text>
          <Text style={styles.subtitle}>
            {session
              ? "This beta now completes sign-in in-app, registers this device identity, and drops into a real group thread with a photo-capable composer."
              : "The shortest path is now invite link, private email, adults-only confirmation, device label, and inbox confirmation handed back into the app."}
          </Text>

          {!session ? (
            <OnboardingScreen
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
            />
          ) : profileSetupActive ? (
            <ProfileSetupScreen
              sessionMessage={sessionMessage}
              profileSetupName={profileSetupName}
              setProfileSetupName={setProfileSetupName}
              profileSetupSelfie={profileSetupSelfie}
              profileSetupError={profileSetupError}
              setProfileSetupError={setProfileSetupError}
              isPickingSelfie={isPickingSelfie}
              isSubmittingProfile={isSubmittingProfile}
              onPickSelfie={() => void pickSelfie()}
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
              onSignOut={() => void signOut()}
              onPreviewInvite={() => void previewInvite()}
              onAcceptInvite={() => void acceptInvite()}
              onPickPhoto={() => void pickPhoto()}
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
