import { useState } from "react";
import type * as SQLite from "expo-sqlite";
import type { AuthSession, FormMessage, GroupInvitePreview, GroupMembershipSummary, GroupInviteAcceptance } from "../../types";
import { normalizeInviteReference } from "../../lib/utils";
import { previewGroupInviteRequest } from "../../lib/inviteApi";
import { saveCachedGroups } from "../../lib/db";

interface UseInvitesProps {
  session: AuthSession | null;
  sessionRef: React.MutableRefObject<AuthSession | null>;
  db: SQLite.SQLiteDatabase | null;
  setGroups: React.Dispatch<React.SetStateAction<GroupMembershipSummary[]>>;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setSessionMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  setFormMessage: React.Dispatch<React.SetStateAction<FormMessage | null>>;
  setAuthMethod: React.Dispatch<React.SetStateAction<"magic-link" | "device-link">>;
  relayFetch: <T>(currentSession: AuthSession, path: string, init?: RequestInit, allowRefresh?: boolean) => Promise<T>;
  inviteToken: string;
  setInviteToken: React.Dispatch<React.SetStateAction<string>>;
  inviteInput: string;
  setInviteInput: React.Dispatch<React.SetStateAction<string>>;
  inviteFocusToken: number;
  setInviteFocusToken: React.Dispatch<React.SetStateAction<number>>;
  inviteFieldVisible: boolean;
  setInviteFieldVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useInvites({
  session,
  sessionRef,
  db,
  setGroups,
  setSelectedConversationId,
  setSessionMessage,
  setFormMessage,
  setAuthMethod,
  relayFetch,
  inviteToken,
  setInviteToken,
  inviteInput,
  setInviteInput,
  inviteFocusToken,
  setInviteFocusToken,
  inviteFieldVisible,
  setInviteFieldVisible,
}: UseInvitesProps) {
  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(null);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [isPreviewingInvite, setIsPreviewingInvite] = useState(false);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);

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

  return {
    inviteToken,
    setInviteToken,
    inviteInput,
    setInviteInput,
    inviteFocusToken,
    setInviteFocusToken,
    invitePreview,
    setInvitePreview,
    invitePreviewError,
    setInvitePreviewError,
    inviteFieldVisible,
    setInviteFieldVisible,
    isPreviewingInvite,
    isAcceptingInvite,
    previewInviteReference,
    previewInvite,
    acceptInvite,
  };
}
