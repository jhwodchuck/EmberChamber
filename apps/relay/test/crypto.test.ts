import { describe, expect, it } from "vitest";
import { blindIndex, normalizeEmail } from "../src/lib/crypto";
import { signAccessToken, verifyAccessToken } from "../src/lib/tokens";

describe("relay crypto helpers", () => {
  it("normalizes email addresses before hashing", async () => {
    const left = await blindIndex("secret", normalizeEmail("Alice@example.com "));
    const right = await blindIndex("secret", normalizeEmail("alice@example.com"));

    expect(left).toBe(right);
  });

  it("signs and verifies access tokens", async () => {
    const token = await signAccessToken(
      {
        sub: "4f50bc1c-6b50-4f90-8c40-b1b7df31d332",
        deviceId: "da489d97-8743-4136-b3bb-f5972cfdbe11",
        sessionId: "19b06453-ed6a-444e-a9f4-dd83940b0ae1",
      },
      "super-secret",
      60
    );

    const verified = await verifyAccessToken(token, "super-secret");
    expect(verified?.sub).toBe("4f50bc1c-6b50-4f90-8c40-b1b7df31d332");
    expect(verified?.deviceId).toBe("da489d97-8743-4136-b3bb-f5972cfdbe11");
  });
});
