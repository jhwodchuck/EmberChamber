import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import type {
  AuthSession,
  ConversationPreference,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../types";
import {
  loadCachedGroupMessages,
  loadConversationPreferences,
  loadLatestCachedGroupMessage,
  saveConversationPreference,
} from "../lib/db";

export function createConversationPreference(
  conversationId: string,
): ConversationPreference {
  return {
    conversationId,
    isArchived: false,
    isPinned: false,
    isMuted: false,
    lastReadAt: null,
  };
}

type UseConversationCatalogArgs = {
  db: SQLite.SQLiteDatabase | null;
  session: AuthSession | null;
  groups: GroupMembershipSummary[];
  selectedConversationId: string | null;
  threadMessages: GroupThreadMessage[];
};

export function useConversationCatalog({
  db,
  session,
  groups,
  selectedConversationId,
  threadMessages,
}: UseConversationCatalogArgs) {
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, GroupThreadMessage | null>
  >({});
  const [conversationPreferences, setConversationPreferences] = useState<
    Record<string, ConversationPreference>
  >({});
  const [unreadConversationCounts, setUnreadConversationCounts] = useState<
    Record<string, number>
  >({});
  const [cacheRevision, setCacheRevision] = useState(0);

  const refreshFromCache = useCallback(() => {
    setCacheRevision((current) => current + 1);
  }, []);

  const updateConversationPreference = useCallback(
    (
      conversationId: string,
      patch: Partial<Omit<ConversationPreference, "conversationId">>,
    ) => {
      let nextPreference = createConversationPreference(conversationId);

      setConversationPreferences((currentPreferences) => {
        const current =
          currentPreferences[conversationId] ??
          createConversationPreference(conversationId);
        nextPreference = {
          ...current,
          ...patch,
          conversationId,
        };

        return {
          ...currentPreferences,
          [conversationId]: nextPreference,
        };
      });

      if (db && session) {
        void saveConversationPreference(
          db,
          session.accountId,
          nextPreference,
        ).catch(() => undefined);
      }
    },
    [db, session],
  );

  const getConversationPreference = useCallback(
    (conversationId: string) =>
      conversationPreferences[conversationId] ??
      createConversationPreference(conversationId),
    [conversationPreferences],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    updateConversationPreference(selectedConversationId, {
      lastReadAt: new Date().toISOString(),
    });
  }, [selectedConversationId, updateConversationPreference]);

  useEffect(() => {
    if (!db || !session) {
      setConversationPreferences({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const preferences = await loadConversationPreferences(
        db,
        session.accountId,
      );
      if (!cancelled) {
        setConversationPreferences(preferences);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, session]);

  useEffect(() => {
    if (!db || !groups.length) {
      setConversationPreviews({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        groups.map(
          async (group) =>
            [
              group.id,
              await loadLatestCachedGroupMessage(db, group.id),
            ] as const,
        ),
      );

      if (!cancelled) {
        setConversationPreviews(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheRevision, db, groups]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setConversationPreviews((current) => ({
      ...current,
      [selectedConversationId]:
        threadMessages[threadMessages.length - 1] ??
        current[selectedConversationId] ??
        null,
    }));
  }, [selectedConversationId, threadMessages]);

  useEffect(() => {
    if (!db || !session || !groups.length) {
      setUnreadConversationCounts({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const counts = await Promise.all(
        groups.map(async (group) => {
          const preference = getConversationPreference(group.id);
          const messages = await loadCachedGroupMessages(db, group.id);
          const unreadCount = messages.filter((message) => {
            if (message.senderAccountId === session.accountId) {
              return false;
            }

            if (!preference.lastReadAt) {
              return true;
            }

            return message.createdAt > preference.lastReadAt;
          }).length;

          return [group.id, unreadCount] as const;
        }),
      );

      if (!cancelled) {
        setUnreadConversationCounts(Object.fromEntries(counts));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    cacheRevision,
    conversationPreviews,
    db,
    getConversationPreference,
    groups,
    session,
  ]);

  return {
    conversationPreferences,
    conversationPreviews,
    getConversationPreference,
    refreshFromCache,
    unreadConversationCounts,
    updateConversationPreference,
  };
}
