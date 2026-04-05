export const MAIN_TABS = ["chats", "invites", "settings"] as const;
export type MainTab = (typeof MAIN_TABS)[number];

export const MAIN_CHAT_VIEWS = ["list", "conversation"] as const;
export type MainChatView = (typeof MAIN_CHAT_VIEWS)[number];

export const CHAT_LIST_FILTERS = ["all", "unread", "pinned", "archived"] as const;
export type ChatListFilter = (typeof CHAT_LIST_FILTERS)[number];

export type PersistedMainShellState = {
  activeTab: MainTab;
  chatView: MainChatView;
  chatFilter: ChatListFilter;
};

type PersistedMainShellStateInput = {
  activeTab?: string | null;
  chatView?: string | null;
  chatFilter?: string | null;
};

export const defaultMainShellState: PersistedMainShellState = {
  activeTab: "chats",
  chatView: "list",
  chatFilter: "all",
};

export function getMainShellActiveTabKey(accountId: string) {
  return `main_shell:${accountId}:active_tab`;
}

export function getMainShellChatViewKey(accountId: string) {
  return `main_shell:${accountId}:chat_view`;
}

export function getMainShellChatFilterKey(accountId: string) {
  return `main_shell:${accountId}:chat_filter`;
}

export function getMainShellLastConversationKey(accountId: string) {
  return `main_shell:${accountId}:last_conversation`;
}

export function getMainShellConversationAnchorKey(
  accountId: string,
  conversationId: string,
) {
  return `main_shell:${accountId}:conversation_anchor:${conversationId}`;
}

export function isMainTab(value: string | null | undefined): value is MainTab {
  return value != null && (MAIN_TABS as readonly string[]).includes(value);
}

export function isMainChatView(value: string | null | undefined): value is MainChatView {
  return value != null && (MAIN_CHAT_VIEWS as readonly string[]).includes(value);
}

export function isChatListFilter(value: string | null | undefined): value is ChatListFilter {
  return value != null && (CHAT_LIST_FILTERS as readonly string[]).includes(value);
}

export function sanitizeMainShellState(
  state: PersistedMainShellStateInput | null | undefined,
): PersistedMainShellState {
  return {
    activeTab: isMainTab(state?.activeTab) ? state.activeTab : defaultMainShellState.activeTab,
    chatView: isMainChatView(state?.chatView) ? state.chatView : defaultMainShellState.chatView,
    chatFilter: isChatListFilter(state?.chatFilter)
      ? state.chatFilter
      : defaultMainShellState.chatFilter,
  };
}
