import type { GroupThreadMessage } from "../../types";
import {
  groupThreadMessageMatchesId,
  groupThreadMessageStableId,
} from "../messageIdentity";

function message(overrides: Partial<GroupThreadMessage>): GroupThreadMessage {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    historyMode: "relay_hosted",
    senderAccountId: "acc-1",
    senderDisplayName: "Tester",
    kind: "text",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as GroupThreadMessage;
}

describe("messageIdentity", () => {
  it("prefers the clientMessageId when present", () => {
    const m = message({ id: "server-id", clientMessageId: "client-id" });
    expect(groupThreadMessageStableId(m)).toBe("client-id");
  });

  it("strips the device-encrypted id prefix", () => {
    const m = message({
      id: "envelope-123:stable-456",
      historyMode: "device_encrypted",
    });
    expect(groupThreadMessageStableId(m)).toBe("stable-456");
  });

  it("falls back to the raw id for relay-hosted messages", () => {
    const m = message({ id: "relay-id" });
    expect(groupThreadMessageStableId(m)).toBe("relay-id");
  });

  it("matches against both the raw id and the stable id", () => {
    const m = message({ id: "server-id", clientMessageId: "client-id" });
    expect(groupThreadMessageMatchesId(m, "server-id")).toBe(true);
    expect(groupThreadMessageMatchesId(m, "client-id")).toBe(true);
    expect(groupThreadMessageMatchesId(m, "other")).toBe(false);
  });
});
