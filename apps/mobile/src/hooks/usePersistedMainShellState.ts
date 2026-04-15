import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import type { AuthSession } from "../types";
import { loadRelayStateValue, saveRelayStateValue } from "../lib/db";
import {
  defaultMainShellState,
  getMainShellActiveTabKey,
  getMainShellChatFilterKey,
  getMainShellChatViewKey,
  getMainShellConversationAnchorKey,
  getMainShellLastConversationKey,
  sanitizeMainShellState,
  type PersistedMainShellState,
} from "../lib/mainShell";

type UsePersistedMainShellStateArgs = {
  db: SQLite.SQLiteDatabase | null;
  session: AuthSession | null;
  selectedConversationId: string | null;
};

export function usePersistedMainShellState({
  db,
  session,
  selectedConversationId,
}: UsePersistedMainShellStateArgs) {
  const [mainShellState, setMainShellState] = useState<PersistedMainShellState>(
    defaultMainShellState,
  );
  const [restoredConversationId, setRestoredConversationId] = useState<
    string | null
  >(null);
  const [restoredConversationAnchorId, setRestoredConversationAnchorId] =
    useState<string | null>(null);
  const [isMainShellReady, setIsMainShellReady] = useState(false);

  const persistMainShellState = useCallback(
    (nextState: PersistedMainShellState) => {
      setMainShellState(nextState);

      if (!db || !session || !isMainShellReady) {
        return;
      }

      void Promise.all([
        saveRelayStateValue(
          db,
          getMainShellActiveTabKey(session.accountId),
          nextState.activeTab,
        ),
        saveRelayStateValue(
          db,
          getMainShellChatViewKey(session.accountId),
          nextState.chatView,
        ),
        saveRelayStateValue(
          db,
          getMainShellChatFilterKey(session.accountId),
          nextState.chatFilter,
        ),
      ]).catch(() => undefined);
    },
    [db, isMainShellReady, session],
  );

  const persistConversationAnchor = useCallback(
    (conversationId: string, messageId: string | null) => {
      if (selectedConversationId === conversationId) {
        setRestoredConversationAnchorId(messageId);
      }

      if (!db || !session) {
        return;
      }

      void saveRelayStateValue(
        db,
        getMainShellConversationAnchorKey(session.accountId, conversationId),
        messageId ?? "",
      ).catch(() => undefined);
    },
    [db, selectedConversationId, session],
  );

  useEffect(() => {
    if (!db) {
      return;
    }

    if (!session) {
      setMainShellState(defaultMainShellState);
      setRestoredConversationId(null);
      setRestoredConversationAnchorId(null);
      setIsMainShellReady(true);
      return;
    }

    let cancelled = false;
    setIsMainShellReady(false);

    void (async () => {
      const [activeTab, chatView, chatFilter, lastConversationId] =
        await Promise.all([
          loadRelayStateValue(db, getMainShellActiveTabKey(session.accountId)),
          loadRelayStateValue(db, getMainShellChatViewKey(session.accountId)),
          loadRelayStateValue(db, getMainShellChatFilterKey(session.accountId)),
          loadRelayStateValue(
            db,
            getMainShellLastConversationKey(session.accountId),
          ),
        ]);

      if (cancelled) {
        return;
      }

      setMainShellState(
        sanitizeMainShellState({
          activeTab: activeTab ?? undefined,
          chatView: chatView ?? undefined,
          chatFilter: chatFilter ?? undefined,
        }),
      );
      setRestoredConversationId(lastConversationId);
      setIsMainShellReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, session]);

  useEffect(() => {
    if (!db || !session || !isMainShellReady || !selectedConversationId) {
      setRestoredConversationAnchorId(null);
      return;
    }

    let cancelled = false;
    setRestoredConversationAnchorId(null);

    void (async () => {
      const anchorId = await loadRelayStateValue(
        db,
        getMainShellConversationAnchorKey(
          session.accountId,
          selectedConversationId,
        ),
      );

      if (!cancelled) {
        setRestoredConversationAnchorId(anchorId || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, isMainShellReady, selectedConversationId, session]);

  useEffect(() => {
    if (!db || !session || !isMainShellReady || !selectedConversationId) {
      return;
    }

    void saveRelayStateValue(
      db,
      getMainShellLastConversationKey(session.accountId),
      selectedConversationId,
    ).catch(() => undefined);
  }, [db, isMainShellReady, selectedConversationId, session]);

  return {
    isMainShellReady,
    mainShellState,
    persistConversationAnchor,
    persistMainShellState,
    restoredConversationAnchorId,
    restoredConversationId,
  };
}
