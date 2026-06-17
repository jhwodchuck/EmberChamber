import {
  defaultMainShellState,
  isChatListFilter,
  isMainChatView,
  isMainTab,
  sanitizeMainShellState,
} from "../mainShell";

describe("mainShell", () => {
  it("recognizes valid tabs, views, and filters", () => {
    expect(isMainTab("chats")).toBe(true);
    expect(isMainTab("nope")).toBe(false);
    expect(isMainChatView("community")).toBe(true);
    expect(isMainChatView("conversation")).toBe(true);
    expect(isMainChatView("bogus")).toBe(false);
    expect(isChatListFilter("pinned")).toBe(true);
    expect(isChatListFilter("everything")).toBe(false);
  });

  it("falls back to defaults for missing or invalid persisted state", () => {
    expect(sanitizeMainShellState(null)).toEqual(defaultMainShellState);
    expect(
      sanitizeMainShellState({
        activeTab: "garbage",
        chatView: "garbage",
        chatFilter: "garbage",
      }),
    ).toEqual(defaultMainShellState);
  });

  it("preserves valid persisted state", () => {
    expect(
      sanitizeMainShellState({
        activeTab: "settings",
        chatView: "community",
        chatFilter: "unread",
      }),
    ).toEqual({
      activeTab: "settings",
      chatView: "community",
      chatFilter: "unread",
    });
  });
});
