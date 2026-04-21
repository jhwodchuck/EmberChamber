import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Notification } from "expo-notifications";
import type {
  AuthSession,
  FormMessage,
} from "../../types";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  addPushTokenRefreshListener,
  getLastNotificationResponse,
  getNotificationConversationId,
  getNotificationReason,
} from "../../lib/push";
import {
  registerNativePushToken,
  syncRefreshedPushToken,
} from "../../lib/pushService";

type RelayFetch = <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
) => Promise<T>;

type UseNotificationBridgeArgs = {
  session: AuthSession | null;
  relayFetch: RelayFetch;
  sessionRef: MutableRefObject<AuthSession | null>;
  selectedConversationIdRef: MutableRefObject<string | null>;
  onSelectConversation: (conversationId: string) => void;
  onRefreshRelayHostedConversation: (conversationId: string) => Promise<void>;
  onSyncEncryptedMailbox: (session: AuthSession) => Promise<void>;
  onSessionMessage: (message: FormMessage) => void;
};

export function useNotificationBridge({
  session,
  relayFetch,
  sessionRef,
  selectedConversationIdRef,
  onSelectConversation,
  onRefreshRelayHostedConversation,
  onSyncEncryptedMailbox,
  onSessionMessage,
}: UseNotificationBridgeArgs) {
  const handlersRef = useRef({
    relayFetch,
    onSelectConversation,
    onRefreshRelayHostedConversation,
    onSyncEncryptedMailbox,
    onSessionMessage,
  });

  handlersRef.current = {
    relayFetch,
    onSelectConversation,
    onRefreshRelayHostedConversation,
    onSyncEncryptedMailbox,
    onSessionMessage,
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const handleNotificationSelection = (notification: Notification) => {
      const {
        onRefreshRelayHostedConversation: refreshRelayHostedConversation,
        onSelectConversation: selectConversation,
        onSessionMessage: publishSessionMessage,
        onSyncEncryptedMailbox: syncEncryptedMailbox,
      } = handlersRef.current;
      const reason = getNotificationReason(notification);
      const conversationId = getNotificationConversationId(notification);
      if (conversationId && reason === "relay_hosted_message") {
        selectConversation(conversationId);
        const currentSession = sessionRef.current;
        if (currentSession) {
          void refreshRelayHostedConversation(conversationId).catch(
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
          selectConversation(conversationId);
        }
        publishSessionMessage({
          tone: "info",
          title: "New secure message",
          body: "A secure conversation is waiting to sync on this device.",
        });
      }
    };

    let receivedSubscription:
      | ReturnType<typeof addNotificationReceivedListener>
      | null = null;
    let responseSubscription:
      | ReturnType<typeof addNotificationResponseReceivedListener>
      | null = null;
    let pushTokenSubscription:
      | ReturnType<typeof addPushTokenRefreshListener>
      | null = null;

    void (async () => {
      try {
        await registerNativePushToken(session, handlersRef.current.relayFetch);
      } catch (error) {
        if (!cancelled) {
          console.warn("mobile_push_registration_failed", error);
        }
      }

      if (cancelled) {
        return;
      }

      receivedSubscription = addNotificationReceivedListener(
        (notification) => {
          const {
            onRefreshRelayHostedConversation: refreshRelayHostedConversation,
            onSyncEncryptedMailbox: syncEncryptedMailbox,
          } = handlersRef.current;
          const conversationId = getNotificationConversationId(notification);
          const reason = getNotificationReason(notification);
          const currentSession = sessionRef.current;

          if (
            currentSession &&
            reason === "relay_hosted_message" &&
            conversationId &&
            selectedConversationIdRef.current === conversationId
          ) {
            void refreshRelayHostedConversation(conversationId).catch(
              () => undefined,
            );
          } else if (currentSession && reason === "mailbox") {
            void syncEncryptedMailbox(currentSession).catch(() => undefined);
          }
        },
      );

      responseSubscription = addNotificationResponseReceivedListener(
        (response) => {
          handleNotificationSelection(response.notification);
        },
      );

      pushTokenSubscription = addPushTokenRefreshListener((token) => {
        const currentSession = sessionRef.current;
        if (!currentSession || typeof token.data !== "string" || !token.data) {
          return;
        }

        void syncRefreshedPushToken(
          currentSession,
          handlersRef.current.relayFetch,
          {
          type: token.type,
          data: token.data,
          },
        ).catch((error) => {
          console.warn("mobile_push_token_refresh_failed", error);
        });
      });

      const lastResponse = getLastNotificationResponse();
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
  }, [
    selectedConversationIdRef,
    session,
    sessionRef,
  ]);
}
