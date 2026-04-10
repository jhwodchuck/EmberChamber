import { Router, Request, Response } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne, withTransaction } from "../db/client";
import {
  signAccessToken,
  signRefreshToken,
  generateRefreshTokenString,
  verifyRefreshToken,
} from "../utils/jwt";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
  displayName: z.string().min(1).max(128),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
  deviceName: z.string().max(128).default("Unknown Device"),
  deviceType: z.enum(["web", "mobile", "desktop"]).default("web"),
});

const RefreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    // Check username availability
    const existingUser = await queryOne(
      "SELECT id FROM users WHERE username = $1",
      [body.username.toLowerCase()],
    );
    if (existingUser) {
      throw createError("Username already taken", 409, "USERNAME_TAKEN");
    }

    if (body.email) {
      const existingEmail = await queryOne(
        "SELECT id FROM users WHERE email = $1",
        [body.email.toLowerCase()],
      );
      if (existingEmail) {
        throw createError("Email already registered", 409, "EMAIL_TAKEN");
      }
    }

    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const result = await withTransaction(async (client) => {
      // Create user
      const { rows: userRows } = await client.query(
        `INSERT INTO users (username, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, display_name, email, created_at`,
        [
          body.username.toLowerCase(),
          body.email?.toLowerCase() ?? null,
          passwordHash,
          body.displayName,
        ],
      );
      const user = userRows[0];

      // Create default privacy settings
      await client.query(
        "INSERT INTO user_privacy_settings (user_id) VALUES ($1)",
        [user.id],
      );

      // Create device
      const { rows: deviceRows } = await client.query(
        `INSERT INTO devices (user_id, device_name, device_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [user.id, "Web Browser", "web"],
      );
      const device = deviceRows[0];

      // Create session
      const sessionId = uuidv4();
      const refreshToken = generateRefreshTokenString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO sessions (id, user_id, device_id, refresh_token, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          user.id,
          device.id,
          refreshToken,
          req.ip,
          req.headers["user-agent"] ?? null,
          expiresAt,
        ],
      );

      const accessToken = signAccessToken(user.id, sessionId);
      const refreshTokenSigned = signRefreshToken(user.id, sessionId);

      return { user, accessToken, refreshToken: refreshTokenSigned };
    });

    res.status(201).json({
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          displayName: result.user.display_name,
          email: result.user.email,
          createdAt: result.user.created_at,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await queryOne<{
      id: string;
      username: string;
      display_name: string;
      email: string;
      password_hash: string;
      is_active: boolean;
      is_suspended: boolean;
    }>(
      `SELECT id, username, display_name, email, password_hash, is_active, is_suspended
       FROM users WHERE username = $1 AND deleted_at IS NULL`,
      [body.username.toLowerCase()],
    );

    if (!user) {
      throw createError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (!user.is_active) {
      throw createError("Account inactive", 403, "ACCOUNT_INACTIVE");
    }

    if (user.is_suspended) {
      throw createError("Account suspended", 403, "ACCOUNT_SUSPENDED");
    }

    if (!user.password_hash) {
      throw createError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await argon2.verify(user.password_hash, body.password);
    if (!valid) {
      throw createError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const result = await withTransaction(async (client) => {
      // Create device record
      const { rows: deviceRows } = await client.query(
        `INSERT INTO devices (user_id, device_name, device_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [user.id, body.deviceName, body.deviceType],
      );
      const device = deviceRows[0];

      const sessionId = uuidv4();
      const refreshToken = generateRefreshTokenString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO sessions (id, user_id, device_id, refresh_token, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          user.id,
          device.id,
          refreshToken,
          req.ip,
          req.headers["user-agent"] ?? null,
          expiresAt,
        ],
      );

      // Update last seen
      await client.query(
        "UPDATE users SET last_seen_at = NOW() WHERE id = $1",
        [user.id],
      );

      return {
        sessionId,
        refreshToken: signRefreshToken(user.id, sessionId),
        accessToken: signAccessToken(user.id, sessionId),
        deviceId: device.id,
      };
    });

    res.json({
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response, next) => {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const session = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM sessions
       WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [payload.sessionId],
    );

    if (!session) {
      throw createError("Session expired", 401, "SESSION_EXPIRED");
    }

    // Update session last active
    await query("UPDATE sessions SET last_active_at = NOW() WHERE id = $1", [
      session.id,
    ]);

    const accessToken = signAccessToken(session.user_id, session.id);
    res.json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post(
  "/logout",
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      await query("UPDATE sessions SET revoked_at = NOW() WHERE id = $1", [
        req.sessionId,
      ]);
      res.json({ data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const user = await queryOne<{
        id: string;
        username: string;
        display_name: string;
        email: string;
        avatar_url: string;
        bio: string;
        created_at: string;
        last_seen_at: string;
      }>(
        `SELECT id, username, display_name, email, avatar_url, bio, created_at, last_seen_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [req.userId],
      );

      if (!user) {
        throw createError("User not found", 404);
      }

      res.json({
        data: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          createdAt: user.created_at,
          lastSeenAt: user.last_seen_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
