import { Router, Response } from "express";
import { z } from "zod";
import { query, queryOne } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  bio: z.string().max(512).optional(),
  avatarUrl: z.string().url().optional(),
});

const UpdatePrivacySchema = z.object({
  showLastSeen: z.boolean().optional(),
  showReadReceipts: z.boolean().optional(),
  allowDmsFrom: z.enum(["everyone", "contacts", "nobody"]).optional(),
  showOnlineStatus: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
});

// GET /api/users/search
router.get("/search", async (req: AuthRequest, res: Response, next) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      res.json({ data: [] });
      return;
    }

    const users = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url
       FROM users u
       INNER JOIN user_privacy_settings ups ON ups.user_id = u.id
       WHERE ups.profile_visible = TRUE
         AND u.deleted_at IS NULL
         AND u.is_suspended = FALSE
         AND u.id != $1
         AND to_tsvector('english', u.username || ' ' || u.display_name)
             @@ plainto_tsquery('english', $2)
       ORDER BY u.username
       LIMIT 20`,
      [req.userId, q]
    );

    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - public profile
router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const user = await queryOne<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      bio: string;
      created_at: string;
      last_seen_at: string;
      show_last_seen: boolean;
      show_online_status: boolean;
      profile_visible: boolean;
    }>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.created_at,
              u.last_seen_at,
              COALESCE(ups.show_last_seen, TRUE) as show_last_seen,
              COALESCE(ups.show_online_status, TRUE) as show_online_status,
              COALESCE(ups.profile_visible, TRUE) as profile_visible
       FROM users u
       LEFT JOIN user_privacy_settings ups ON ups.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id]
    );

    if (!user || !user.profile_visible) {
      throw createError("User not found", 404);
    }

    res.json({
      data: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
        lastSeenAt: user.show_last_seen ? user.last_seen_at : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me - update own profile
router.patch("/me", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = UpdateProfileSchema.parse(req.body);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (body.displayName !== undefined) {
      updates.push(`display_name = $${paramIdx++}`);
      params.push(body.displayName);
    }
    if (body.bio !== undefined) {
      updates.push(`bio = $${paramIdx++}`);
      params.push(body.bio);
    }
    if (body.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIdx++}`);
      params.push(body.avatarUrl);
    }

    if (updates.length === 0) throw createError("No fields to update", 400);

    updates.push(`updated_at = NOW()`);
    params.push(req.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(", ")}
       WHERE id = $${paramIdx}
       RETURNING id, username, display_name, email, avatar_url, bio, updated_at`,
      params
    );

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/privacy
router.patch(
  "/me/privacy",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const body = UpdatePrivacySchema.parse(req.body);

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (body.showLastSeen !== undefined) {
        updates.push(`show_last_seen = $${paramIdx++}`);
        params.push(body.showLastSeen);
      }
      if (body.showReadReceipts !== undefined) {
        updates.push(`show_read_receipts = $${paramIdx++}`);
        params.push(body.showReadReceipts);
      }
      if (body.allowDmsFrom !== undefined) {
        updates.push(`allow_dms_from = $${paramIdx++}`);
        params.push(body.allowDmsFrom);
      }
      if (body.showOnlineStatus !== undefined) {
        updates.push(`show_online_status = $${paramIdx++}`);
        params.push(body.showOnlineStatus);
      }
      if (body.profileVisible !== undefined) {
        updates.push(`profile_visible = $${paramIdx++}`);
        params.push(body.profileVisible);
      }

      if (updates.length === 0) throw createError("No fields to update", 400);

      updates.push(`updated_at = NOW()`);
      params.push(req.userId);

      await query(
        `INSERT INTO user_privacy_settings (user_id)
         VALUES ($${paramIdx})
         ON CONFLICT (user_id) DO UPDATE SET ${updates.join(", ")}`,
        params
      );

      res.json({ data: { message: "Privacy settings updated" } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/me/sessions
router.get(
  "/me/sessions",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const sessions = await query(
        `SELECT s.id, s.ip_address, s.user_agent, s.created_at, s.last_active_at,
                d.device_name, d.device_type
         FROM sessions s
         LEFT JOIN devices d ON d.id = s.device_id
         WHERE s.user_id = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
         ORDER BY s.last_active_at DESC`,
        [req.userId]
      );

      const enriched = sessions.map((s: Record<string, unknown>) => ({
        ...s,
        isCurrent: s.id === req.sessionId,
      }));

      res.json({ data: enriched });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/users/me/sessions/:sessionId
router.delete(
  "/me/sessions/:sessionId",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { sessionId } = req.params;

      const session = await queryOne(
        "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
        [sessionId, req.userId]
      );

      if (!session) throw createError("Session not found", 404);

      await query(
        "UPDATE sessions SET revoked_at = NOW() WHERE id = $1",
        [sessionId]
      );

      res.json({ data: { message: "Session revoked" } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/users/block
router.post("/block", async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId: targetId, reason } = z
      .object({ userId: z.string().uuid(), reason: z.string().optional() })
      .parse(req.body);

    if (targetId === req.userId) {
      throw createError("Cannot block yourself", 400);
    }

    await query(
      `INSERT INTO blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [req.userId, targetId, reason ?? null]
    );

    res.json({ data: { message: "User blocked" } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/block/:userId
router.delete(
  "/block/:userId",
  async (req: AuthRequest, res: Response, next) => {
    try {
      await query(
        "DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2",
        [req.userId, req.params.userId]
      );

      res.json({ data: { message: "User unblocked" } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/users/report
router.post("/report", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = z
      .object({
        reportedUserId: z.string().uuid().optional(),
        reportedMessageId: z.string().uuid().optional(),
        reportedChannelId: z.string().uuid().optional(),
        reportedPostId: z.string().uuid().optional(),
        reason: z.enum([
          "spam",
          "harassment",
          "illegal",
          "csam",
          "malware",
          "impersonation",
          "other",
        ]),
        details: z.string().max(1024).optional(),
      })
      .parse(req.body);

    if (
      !body.reportedUserId &&
      !body.reportedMessageId &&
      !body.reportedChannelId &&
      !body.reportedPostId
    ) {
      throw createError("Must specify what to report", 400);
    }

    await query(
      `INSERT INTO reports
         (reporter_id, reported_user_id, reported_message_id, reported_channel_id, reported_post_id, reason, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.userId,
        body.reportedUserId ?? null,
        body.reportedMessageId ?? null,
        body.reportedChannelId ?? null,
        body.reportedPostId ?? null,
        body.reason,
        body.details ?? null,
      ]
    );

    res.status(201).json({ data: { message: "Report submitted" } });
  } catch (err) {
    next(err);
  }
});

export default router;
