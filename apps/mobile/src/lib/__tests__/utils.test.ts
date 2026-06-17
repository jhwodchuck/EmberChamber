import {
  extractCompletionTokenFromUrl,
  formatBytes,
  isDefaultDisplayName,
  isLegacySuggestedDeviceLabel,
  isValidEmail,
  normalizeInviteReference,
} from "../utils";

describe("utils", () => {
  it("validates email shape", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("detects legacy suggested device labels", () => {
    expect(isLegacySuggestedDeviceLabel("Android phone")).toBe(true);
    expect(isLegacySuggestedDeviceLabel("")).toBe(true);
    expect(isLegacySuggestedDeviceLabel("Pixel 8")).toBe(false);
  });

  it("recognizes default display names", () => {
    expect(isDefaultDisplayName("Member 0a1b2c3d")).toBe(true);
    expect(isDefaultDisplayName("Ember Alpha")).toBe(false);
  });

  it("extracts completion tokens from magic-link urls", () => {
    expect(
      extractCompletionTokenFromUrl(
        "https://app.example.com/auth/complete?token=abc123",
      ),
    ).toBe("abc123");
    expect(
      extractCompletionTokenFromUrl("https://app.example.com/other?token=abc"),
    ).toBeNull();
    expect(extractCompletionTokenFromUrl("not a url")).toBeNull();
  });

  it("normalizes invite references from urls and raw forms", () => {
    expect(
      normalizeInviteReference("https://relay.example.com/invite/group-1/tok-2"),
    ).toEqual({ groupId: "group-1", inviteToken: "tok-2" });
    expect(normalizeInviteReference("group-9/tok-9")).toEqual({
      groupId: "group-9",
      inviteToken: "tok-9",
    });
    expect(normalizeInviteReference("group-3:tok-3")).toEqual({
      groupId: "group-3",
      inviteToken: "tok-3",
    });
    expect(normalizeInviteReference("")).toBeNull();
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
