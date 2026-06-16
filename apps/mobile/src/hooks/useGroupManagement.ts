import { useCallback, useState } from "react";
import * as SQLite from "expo-sqlite";
import {
  loadContactLabel,
  saveContactLabel,
  saveCachedGroups,
} from "../lib/db";
import type {
  AuthSession,
  FormMessage,
  GroupInviteRecord,
  GroupMember,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../types";

type UseGroupManagementParams = {
  session: AuthSession | null;
  selectedGroup: GroupMembershipSummary | null;
  groups: GroupMembershipSummary[];
  db: SQLite.SQLiteDatabase | null;
  relayFetch: <T>(session: AuthSession, path: string, init?: RequestInit) => Promise<T>;
  setGroups: (
    updater:
      | GroupMembershipSummary[]
      | ((prev: GroupMembershipSummary[]) => GroupMembershipSummary[]),
  ) => void;
  setSelectedConversationId: (id: string | null) => void;
  setThreadMessages: (
    updater:
      | GroupThreadMessage[]
      | ((prev: GroupThreadMessage[]) => GroupThreadMessage[]),
  ) => void;
  setSessionMessage: (msg: FormMessage | null) => void;
  setMessageDraft: (draft: string) => void;
};

export function useGroupManagement({
  session,
  selectedGroup,
  groups,
  db,
  relayFetch,
  setGroups,
  setSelectedConversationId,
  setThreadMessages,
  setSessionMessage,
  setMessageDraft,
}: UseGroupManagementParams) {
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isOpeningDm, setIsOpeningDm] = useState(false);

  const handleUpdateGroup = useCallback(
    async (title: string, sensitiveMedia: boolean) => {
      if (!session || !selectedGroup) return;
      await relayFetch<{ updated: boolean }>(
        session,
        `/v1/groups/${selectedGroup.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title, sensitiveMediaDefault: sensitiveMedia }),
        },
      );
      const nextGroups = await relayFetch<GroupMembershipSummary[]>(session, "/v1/groups");
      setGroups(nextGroups);
      if (db) await saveCachedGroups(db, session.accountId, nextGroups);
    },
    [session, selectedGroup, relayFetch, setGroups, db],
  );

  const handleCreateInvite = useCallback(async (): Promise<GroupInviteRecord | null> => {
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
  }, [session, selectedGroup, relayFetch]);

  const handleOpenMembers = useCallback(async () => {
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
  }, [session, selectedGroup, relayFetch]);

  const handleLoadMemberNote = useCallback(
    async (accountId: string): Promise<string | null> => {
      if (!db) return null;
      const { privateNote } = await loadContactLabel(db, accountId);
      return privateNote;
    },
    [db],
  );

  const handleSaveMemberNote = useCallback(
    async (accountId: string, note: string) => {
      if (!db) return;
      const label =
        groupMembers.find((m) => m.accountId === accountId)?.displayName ?? accountId;
      await saveContactLabel(db, accountId, label, note || null);
    },
    [db, groupMembers],
  );

  const handleOpenDm = useCallback(
    async (targetAccountId: string, displayName: string) => {
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
    },
    [session, groups, relayFetch, setGroups, setSelectedConversationId, setThreadMessages, setSessionMessage],
  );

  const handleSendContactRequest = useCallback(
    (targetAccountId: string, displayName: string) => {
      void handleOpenDm(targetAccountId, displayName).then(() => {
        setMessageDraft("Hey! I'd like to connect with you. 👋");
      });
    },
    [handleOpenDm, setMessageDraft],
  );

  const clearGroupMembers = useCallback(() => setGroupMembers([]), []);

  return {
    groupMembers,
    isLoadingMembers,
    isOpeningDm,
    clearGroupMembers,
    handleUpdateGroup,
    handleCreateInvite,
    handleOpenMembers,
    handleLoadMemberNote,
    handleSaveMemberNote,
    handleOpenDm,
    handleSendContactRequest,
  };
}
