import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { createError } from "../middleware/errorHandler";
import { z } from "zod";

// Set env vars before tests
process.env.JWT_SECRET = "test-secret-key-for-testing";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-testing";

describe("JWT utilities", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const sessionId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

  describe("signAccessToken / verifyAccessToken", () => {
    it("should create and verify a valid access token", () => {
      const token = signAccessToken(userId, sessionId);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT format

      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.sessionId).toBe(sessionId);
      expect(payload.type).toBe("access");
    });

    it("should throw on invalid access token", () => {
      expect(() => verifyAccessToken("invalid.token.here")).toThrow();
    });

    it("should throw when refresh token used as access token", () => {
      const refreshToken = signRefreshToken(userId, sessionId);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe("signRefreshToken / verifyRefreshToken", () => {
    it("should create and verify a valid refresh token", () => {
      const token = signRefreshToken(userId, sessionId);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.sessionId).toBe(sessionId);
      expect(payload.type).toBe("refresh");
    });

    it("should throw when access token used as refresh token", () => {
      const accessToken = signAccessToken(userId, sessionId);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});

describe("Middleware error handler", () => {
  it("should create an error with status code", () => {
    const err = createError("Not found", 404, "NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("should create an error without a code", () => {
    const err = createError("Server error", 500);
    expect(err.statusCode).toBe(500);
    expect(err.code).toBeUndefined();
  });
});

describe("Validation schemas", () => {
  it("should validate username format", () => {
    const UsernameSchema = z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/);

    expect(() => UsernameSchema.parse("valid_user-123")).not.toThrow();
    expect(() => UsernameSchema.parse("ab")).toThrow(); // too short
    expect(() => UsernameSchema.parse("invalid user!")).toThrow(); // invalid chars
  });
});
