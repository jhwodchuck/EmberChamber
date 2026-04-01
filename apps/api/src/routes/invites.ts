import { Router, Response, Request } from "express";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { generateInviteCode } from "../utils/jwt";

const router = Router();

const CreateInviteSchema = z.object({
  conversationId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  expiresInHours: z.number().min(1).max(168).optional(), // max 7 days
  maxUses: z.number().min(1).max(1000).optional(),
});

// POST /api/invites - create invite
router.post("/", authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const body = CreateInviteSchema.parse(req.body);

    if (!body.conversationId && !body.channelId) {
      throw createError("Must specify conversationId or channelId", 400);
    }

    // Verify permissions
    if (body.conversationId) {
      const member = await queryOne<{ role: string }>(
        `SELECT role FROM conversation_members
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [body.conversationId, req.userId]
      );
      if (!member) throw createError("Conversation not found", 404);
      if (!["owner", "admin"].includes(member.role)) {
        throw createError("Insufficient permissions to create invites", 403);
      }
    }

    if (body.channelId) {
      const member = await queryOne<{ role: string }>(
        `SELECT role FROM channel_members
         WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [body.channelId, req.userId]
      );
      if (!member) throw createError("Channel not found", 404);
      if (!["owner", "admin"].includes(member.role)) {
        throw createError("Insufficient permissions to create invites", 403);
      }
    }

    const code = generateInviteCode();
    const expiresAt = body.expiresInHours
      ? new Date(Date.now() + body.expiresInHours * 3600 * 1000)
      : null;

    const invite = await query(
      `INSERT INTO invites (code, conversation_id, channel_id, created_by, expires_at, max_uses)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, conversation_id, channel_id, expires_at, max_uses, use_count, created_at`,
      [
        code,
        body.conversationId ?? null,
        body.channelId ?? null,
        req.userId,
        expiresAt,
        body.maxUses ?? null,
      ]
    );

    res.status(201).json({ data: invite[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/invites/:code - preview invite
router.get("/:code", async (req: Request, res: Response, next) => {
  try {
    const { code } = req.params;

    const invite = await queryOne<{
      id: string;
      code: string;
      conversation_id: string;
      channel_id: string;
      expires_at: string;
      max_uses: number;
      use_count: number;
      status: string;
    }>(
      `SELECT id, code, conversation_id, channel_id, expires_at, max_uses, use_count, status
       FROM invites WHERE code = $1`,
      [code]
    );

    if (!invite) throw createError("Invalid invite code", 404);
    if (invite.status === "revoked") throw createError("Invite has been revoked", 410);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw createError("Invite has expired", 410);
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      throw createError("Invite has reached maximum uses", 410);
    }

    // Fetch target info
    let target = null;
    if (invite.conversation_id) {
      target = await queryOne(
        "SELECT id, type, name, avatar_url FROM conversations WHERE id = $1",
        [invite.conversation_id]
      );
    } else if (invite.channel_id) {
      target = await queryOne(
        "SELECT id, name, description, avatar_url, member_count FROM channels WHERE id = $1",
        [invite.channel_id]
      );
    }

    res.json({ data: { invite, target } });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:code/accept
router.post("/:code/accept", authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const invite = await queryOne<{
      id: string;
      conversation_id: string;
      channel_id: string;
      expires_at: string;
      max_uses: number;
      use_count: number;
      status: string;
    }>(
      `SELECT id, conversation_id, channel_id, expires_at, max_uses, use_count, status
       FROM invites WHERE code = $1`,
      [code]
    );

    if (!invite) throw createError("Invalid invite code", 404);
    if (invite.status === "revoked") throw createError("Invite has been revoked", 410);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw createError("Invite has expired", 410);
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      throw createError("Invite has reached maximum uses", 410);
    }

    await withTransaction(async (client) => {
      if (invite.conversation_id) {
        await client.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL`,
          [invite.conversation_id, req.userId]
        );
      } else if (invite.channel_id) {
        await client.query(
          `INSERT INTO channel_members (channel_id, user_id, role)
           VALUES ($1, $2, 'subscriber')
           ON CONFLICT (channel_id, user_id) DO UPDATE SET left_at = NULL`,
          [invite.channel_id, req.userId]
        );
        await client.query(
          "UPDATE channels SET member_count = member_count + 1 WHERE id = $1",
          [invite.channel_id]
        );
      }

      // Increment use count
      await client.query(
        "UPDATE invites SET use_count = use_count + 1 WHERE id = $1",
        [invite.id]
      );
    });

    res.json({
      data: {
        message: "Joined successfully",
        conversationId: invite.conversation_id,
        channelId: invite.channel_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/invites/:id - revoke invite
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const invite = await queryOne(
      "SELECT id FROM invites WHERE id = $1 AND created_by = $2",
      [req.params.id, req.userId]
    );

    if (!invite) throw createError("Invite not found", 404);

    await query(
      "UPDATE invites SET status = 'revoked' WHERE id = $1",
      [req.params.id]
    );

    res.json({ data: { message: "Invite revoked" } });
  } catch (err) {
    next(err);
  }
});

export default router;
