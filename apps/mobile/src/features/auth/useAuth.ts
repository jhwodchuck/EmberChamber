import { useState } from "react";
import type {
  AuthSession,
  ContactCard,
  Field,
  FormMessage,
  GroupMembershipSummary,
  GroupThreadMessage,
  MagicLinkResponse,
  MeProfile,
  PendingAttachment,
  SessionDescriptor,
} from "../../types";
import { STORAGE_KEYS } from "../../constants";
import { isValidEmail, normalizeInviteReference, suggestMobileDeviceLabel } from "../../lib/utils";
import { clearStoredSession, saveStoredSession } from "../../lib/session";
import { completeMagicLinkRequest, requestRelaySessionRefresh, startMagicLinkRequest } from "../../lib/authApi";
import { relayFetch as relayFetchRequest } from "../../lib/relayClient";
import { relayUrl } from "../../constants";
import { secureStorageCapability } from "../../lib/nativeCapabilities";
import { clearNativePushToken } from "../../lib/pushService";
import type { ActiveDeviceLink } from "../deviceLink/useDeviceLink";
import type { DeviceLinkStatus } from "@emberchamber/protocol";

interface UseAuthProps {
  session: AuthSession | null;
  setSession: React.Dispatch<React.SetStateAction<AuthSession | null>>;
  sessionRef: React.MutableRefObject<AuthSession | null>;
  inviteToken: string;
  inviteInput: string;
  inviteFieldVisible: boolean;
  setInviteFieldVisible: React.Dispatch<React.SetStateAction<boolean>>;
  deviceLabel: string;
  setProfile: React.Dispatch<React.SetStateAction<MeProfile | null>>;
  setContactCard: React.Dispatch<React.SetStateAction<ContactCard | null>>;
  setGroups: React.Dispatch<React.SetStateAction<GroupMembershipSummary[]>>;
  setThreadMessages: React.Dispatch<React.SetStateAction<GroupThreadMessage[]>>;
  setPendingAttachment: React.Dispatch<React.SetStateAction<PendingAttachment | null>>;
  setProfileSetupActive: React.Dispatch<React.SetStateAction<boolean>>;
  setProfileSetupName: React.Dispatch<React.SetStateAction<string>>;
  setProfileSetupError: React.Dispatch<React.SetStateAction<string | null>>;
  setAuthMethod: React.Dispatch<React.SetStateAction<"magic-link" | "device-link">>;
  setSessionMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  setFormMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  setInviteFocusToken: React.Dispatch<React.SetStateAction<number>>;
  setCompletedDeviceLinkSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setDeviceLinkQrValue: React.Dispatch<React.SetStateAction<string | null>>;
  setDeviceLinkStatus: React.Dispatch<React.SetStateAction<DeviceLinkStatus | null>>;
  setDeviceLinkMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  setActiveDeviceLink: React.Dispatch<React.SetStateAction<ActiveDeviceLink | null>>;

  // States passed from App.tsx
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  ageConfirmed18: boolean;
  setAgeConfirmed18: React.Dispatch<React.SetStateAction<boolean>>;
  challenge: MagicLinkResponse | null;
  setChallenge: React.Dispatch<React.SetStateAction<MagicLinkResponse | null>>;
  sessions: SessionDescriptor[];
  setSessions: React.Dispatch<React.SetStateAction<SessionDescriptor[]>>;
  isLoadingSessions: boolean;
  setIsLoadingSessions: React.Dispatch<React.SetStateAction<boolean>>;
  sessionsError: string | null;
  setSessionsError: React.Dispatch<React.SetStateAction<string | null>>;
  isRevokingSession: string | null;
  setIsRevokingSession: React.Dispatch<React.SetStateAction<string | null>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  isCompleting: boolean;
  setIsCompleting: React.Dispatch<React.SetStateAction<boolean>>;
  errors: Partial<Record<Field, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<Field, string>>>>;
}

export function useAuth({
  session,
  setSession,
  sessionRef,
  inviteToken,
  inviteInput,
  inviteFieldVisible,
  setInviteFieldVisible,
  deviceLabel,
  setProfile,
  setContactCard,
  setGroups,
  setThreadMessages,
  setPendingAttachment,
  setProfileSetupActive,
  setProfileSetupName,
  setProfileSetupError,
  setAuthMethod,
  setSessionMessage,
  setFormMessage,
  setInviteFocusToken,
  setCompletedDeviceLinkSessionId,
  setDeviceLinkQrValue,
  setDeviceLinkStatus,
  setDeviceLinkMessage,
  setActiveDeviceLink,
  email,
  setEmail,
  ageConfirmed18,
  setAgeConfirmed18,
  challenge,
  setChallenge,
  sessions,
  setSessions,
  isLoadingSessions,
  setIsLoadingSessions,
  sessionsError,
  setSessionsError,
  isRevokingSession,
  setIsRevokingSession,
  isSending,
  setIsSending,
  isCompleting,
  setIsCompleting,
  errors,
  setErrors,
}: UseAuthProps) {
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
    const { response, body } = await requestRelaySessionRefresh(currentSession.refreshToken);

    if (!response.ok || !("accessToken" in body)) {
      setSessionMessage({
        tone: "warning",
        title: "Session refresh failed",
        body: "This phone kept its saved session so it can retry refresh instead of losing the only recovery token.",
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
        error instanceof Error ? error.message : "Unable to load signed-in sessions.",
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
        error instanceof Error ? error.message : "Unable to revoke that session.",
      );
    } finally {
      setIsRevokingSession(null);
    }
  }

  function buildSessionReadyMessage(
    nextSession: AuthSession,
    source: "magic-link" | "device-link",
  ): FormMessage {
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

  async function persistAuthenticatedSession(
    nextSession: AuthSession,
    source: "magic-link" | "device-link",
  ) {
    const normalizedDeviceLabel = deviceLabel.trim() || suggestMobileDeviceLabel();
    const bootstrapInvite = normalizeInviteReference(inviteInput);

    await Promise.all([
      saveStoredSession(nextSession),
      secureStorageCapability.setItem(STORAGE_KEYS.deviceLabel, normalizedDeviceLabel),
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
        title: source === "device-link" ? "Device linked and invite ready" : "Signed in and invite ready",
        body: "The incoming invite is loaded under Invites. Review the preview there and join when you are ready.",
      });
    } else {
      setSessionMessage(buildSessionReadyMessage(nextSession, source));
    }
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
        secureStorageCapability.setItem(STORAGE_KEYS.inviteToken, inviteToken.trim()),
        secureStorageCapability.setItem(STORAGE_KEYS.deviceLabel, deviceLabel.trim()),
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
    
    setDeviceLinkQrValue(null);
    setDeviceLinkStatus(null);
    setDeviceLinkMessage(null);
    setActiveDeviceLink(null);
    setCompletedDeviceLinkSessionId(null);
    
    setSessionMessage({
      tone: "info",
      title: "Signed out",
      body: "This device no longer has a relay session. You can request a fresh magic link whenever needed.",
    });
  }

  return {
    refreshRelaySession,
    refreshSignedInSessions,
    revokeSignedInSession,
    persistAuthenticatedSession,
    submitMagicLink,
    completeMagicLink,
    signOut,
    relayFetch,
  };
}
