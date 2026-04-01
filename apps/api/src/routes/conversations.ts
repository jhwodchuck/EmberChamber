import { Router, Response } from "express";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import redis, { keys } from "../db/redis";

const router = Router();

// All routes require auth
router.use(authenticate);

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  isEncrypted: z.boolean().default(false),
  memberIds: z.array(z.string().uuid()).max(99).optional(),
});

const UpdateConversationSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4096).optional(),
  type: z.enum(["text", "file", "image", "audio"]).default("text"),
  attachmentId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
  encryptedContent: z.string().optional(),
});

// GET /api/conversations - list user's conversations
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const conversations = await query<{
      id: string;
      type: string;
      name: string;
      description: string;
      avatar_url: string;
      is_encrypted: boolean;
      updated_at: string;
      created_at: string;
    }>(
      `SELECT c.id, c.type, c.name, c.description, c.avatar_url,
              c.is_encrypted, c.updated_at, c.created_at
       FROM conversations c
       INNER JOIN conversation_members cm ON cm.conversation_id = c.id
       WHERE cm.user_id = $1 AND cm.left_at IS NULL
         AND c.archived_at IS NULL
       ORDER BY c.updated_at DESC
       LIMIT 100`,
      [req.userId]
    );

    // Enrich with last message and unread count
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await queryOne<{
          id: string;
          content: string;
          type: string;
          sender_id: string;
          created_at: string;
        }>(
          `SELECT id, content, type, sender_id, created_at
           FROM messages
           WHERE conversation_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC LIMIT 1`,
          [conv.id]
        );

        const unread = await queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM messages m
           WHERE m.conversation_id = $1
             AND m.sender_id != $2
             AND m.deleted_at IS NULL
             AND m.created_at > COALESCE(
               (SELECT last_read_at FROM conversation_members
                WHERE conversation_id = $1 AND user_id = $2),
               '1970-01-01'::timestamptz
             )`,
          [conv.id, req.userId]
        );

        // For DMs, get the other user's info
        let dmUser = null;
        if (conv.type === "dm") {
          dmUser = await queryOne<{
            id: string;
            username: string;
            display_name: string;
            avatar_url: string;
          }>(
            `SELECT u.id, u.username, u.display_name, u.avatar_url
             FROM users u
             INNER JOIN conversation_members cm ON cm.user_id = u.id
             WHERE cm.conversation_id = $1 AND u.id != $2
             LIMIT 1`,
            [conv.id, req.userId]
          );
        }

        return {
          id: conv.id,
          type: conv.type,
          name: conv.type === "dm" ? dmUser?.display_name : conv.name,
          description: conv.description,
          avatarUrl: conv.type === "dm" ? dmUser?.avatar_url : conv.avatar_url,
          isEncrypted: conv.is_encrypted,
          updatedAt: conv.updated_at,
          createdAt: conv.created_at,
          lastMessage: lastMsg,
          unreadCount: parseInt(unread?.count ?? "0"),
          dmUser: dmUser ?? undefined,
        };
      })
    );

    res.json({ data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/dm - open or get DM conversation
router.post("/dm", async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId: targetUserId } = z
      .object({ userId: z.string().uuid() })
      .parse(req.body);

    if (targetUserId === req.userId) {
      throw createError("Cannot DM yourself", 400);
    }

    // Check target user exists
    const target = await queryOne("SELECT id FROM users WHERE id = $1", [
      targetUserId,
    ]);
    if (!target) {
      throw createError("User not found", 404);
    }

    // Check if blocked
    const blocked = await queryOne(
      `SELECT id FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [req.userId, targetUserId]
    );
    if (blocked) {
      throw createError("Cannot start conversation", 403, "BLOCKED");
    }

    // Find existing DM
    const existing = await queryOne<{ id: string }>(
      `SELECT c.id FROM conversations c
       INNER JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
       INNER JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
       WHERE c.type = 'dm' AND cm1.left_at IS NULL AND cm2.left_at IS NULL`,
      [req.userId, targetUserId]
    );

    if (existing) {
      res.json({ data: { id: existing.id, isNew: false } });
      return;
    }

    const targetPrivacy = await queryOne<{
      allow_dms_from: "everyone" | "contacts" | "nobody";
    }>(
      `SELECT allow_dms_from
       FROM user_privacy_settings
       WHERE user_id = $1`,
      [targetUserId]
    );

    const dmPolicy = targetPrivacy?.allow_dms_from ?? "everyone";
    if (dmPolicy === "nobody") {
      throw createError(
        "This user is not accepting new direct messages",
        403,
        "DM_NOT_ALLOWED"
      );
    }

    if (dmPolicy === "contacts") {
      const existingContact = await queryOne(
        `SELECT id
         FROM contacts
         WHERE (user_id = $1 AND contact_id = $2)
            OR (user_id = $2 AND contact_id = $1)
         LIMIT 1`,
        [req.userId, targetUserId]
      );

      if (!existingContact) {
        throw createError(
          "This user only accepts direct messages from contacts",
          403,
          "DM_CONTACTS_ONLY"
        );
      }
    }

    // Create new DM conversation
    const conv = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO conversations (type, is_encrypted, created_by)
         VALUES ('dm', FALSE, $1) RETURNING id`,
        [req.userId]
      );
      const conv = rows[0];

      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
        [conv.id, req.userId, targetUserId]
      );

      return conv;
    });

    res.status(201).json({ data: { id: conv.id, isNew: true } });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/group - create group
router.post("/group", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = CreateGroupSchema.parse(req.body);

    const conv = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO conversations (type, name, description, is_encrypted, created_by)
         VALUES ('group', $1, $2, $3, $4) RETURNING id, name, type, created_at`,
        [body.name, body.description ?? null, body.isEncrypted, req.userId]
      );
      const conv = rows[0];

      // Add creator as owner
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [conv.id, req.userId]
      );

      // Add other members
      if (body.memberIds?.length) {
        for (const memberId of body.memberIds) {
          if (memberId !== req.userId) {
            await client.query(
              `INSERT INTO conversation_members (conversation_id, user_id, role)
               VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
              [conv.id, memberId]
            );
          }
        }
      }

      return conv;
    });

    res.status(201).json({ data: conv });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id - get single conversation
router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    // Verify membership
    const member = await queryOne(
      `SELECT id FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );
    if (!member) {
      throw createError("Conversation not found", 404);
    }

    const conv = await queryOne<{
      id: string;
      type: string;
      name: string;
      description: string;
      avatar_url: string;
      is_encrypted: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, type, name, description, avatar_url, is_encrypted, created_at, updated_at
       FROM conversations WHERE id = $1`,
      [id]
    );

    const members = await query<{
      user_id: string;
      role: string;
      joined_at: string;
      username: string;
      display_name: string;
      avatar_url: string;
    }>(
      `SELECT cm.user_id, cm.role, cm.joined_at,
              u.username, u.display_name, u.avatar_url
       FROM conversation_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1 AND cm.left_at IS NULL`,
      [id]
    );

    res.json({ data: { ...conv, members } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/conversations/:id - update group info
router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = UpdateConversationSchema.parse(req.body);

    const member = await queryOne<{ role: string }>(
      `SELECT role FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (!member) throw createError("Conversation not found", 404);
    if (!["owner", "admin"].includes(member.role)) {
      throw createError("Insufficient permissions", 403);
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(body.description);
    }

    if (updates.length === 0) {
      throw createError("No fields to update", 400);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE conversations SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
      params
    );

    res.json({ data: { message: "Updated" } });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id/messages - get messages
router.get("/:id/messages", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    // Verify membership
    const member = await queryOne(
      `SELECT id FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );
    if (!member) {
      throw createError("Conversation not found", 404);
    }

    const messages = await query<{
      id: string;
      conversation_id: string;
      sender_id: string;
      type: string;
      content: string;
      encrypted_content: string;
      attachment_id: string;
      reply_to_id: string;
      edited_at: string;
      deleted_at: string;
      created_at: string;
      username: string;
      display_name: string;
      avatar_url: string;
    }>(
      `SELECT m.id, m.conversation_id, m.sender_id, m.type,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content END as content,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.encrypted_content END as encrypted_content,
              m.attachment_id, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
              u.username, u.display_name, u.avatar_url
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
         ${before ? "AND m.created_at < $3" : ""}
       ORDER BY m.created_at DESC
       LIMIT $2`,
      before ? [id, limit, before] : [id, limit]
    );

    // Update read status
    await query(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    res.json({ data: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/messages - send message
router.post("/:id/messages", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = SendMessageSchema.parse(req.body);

    if (!body.content && !body.attachmentId) {
      throw createError("Message must have content or attachment", 400);
    }

    // Verify membership and not muted
    const member = await queryOne<{ role: string; muted_until: string }>(
      `SELECT role, muted_until FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );
    if (!member) {
      throw createError("Conversation not found", 404);
    }

    if (
      member.muted_until &&
      new Date(member.muted_until) > new Date()
    ) {
      throw createError("You are muted in this conversation", 403, "MUTED");
    }

    const message = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO messages
           (conversation_id, sender_id, type, content, encrypted_content, attachment_id, reply_to_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, conversation_id, sender_id, type, content, encrypted_content,
                   attachment_id, reply_to_id, created_at`,
        [
          id,
          req.userId,
          body.type,
          body.content ?? null,
          body.encryptedContent ?? null,
          body.attachmentId ?? null,
          body.replyToId ?? null,
        ]
      );

      // Update conversation updated_at
      await client.query(
        "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
        [id]
      );

      return rows[0];
    });

    // Publish to Redis for WebSocket fan-out
    await redis.publish(
      `conv:${id}`,
      JSON.stringify({
        type: "message.new",
        payload: message,
        timestamp: new Date().toISOString(),
      })
    );

    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/conversations/:id/messages/:msgId - edit message
router.patch(
  "/:id/messages/:msgId",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id, msgId } = req.params;
      const { content } = z
        .object({ content: z.string().min(1).max(4096) })
        .parse(req.body);

      const msg = await queryOne<{ sender_id: string }>(
        `SELECT sender_id FROM messages
         WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL`,
        [msgId, id]
      );

      if (!msg) throw createError("Message not found", 404);
      if (msg.sender_id !== req.userId) {
        throw createError("Cannot edit another user's message", 403);
      }

      await query(
        "UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2",
        [content, msgId]
      );

      await redis.publish(
        `conv:${id}`,
        JSON.stringify({
          type: "message.edited",
          payload: { id: msgId, content, editedAt: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        })
      );

      res.json({ data: { message: "Updated" } });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/conversations/:id/messages/:msgId
router.delete(
  "/:id/messages/:msgId",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id, msgId } = req.params;

      const msg = await queryOne<{ sender_id: string }>(
        `SELECT sender_id FROM messages
         WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL`,
        [msgId, id]
      );

      if (!msg) throw createError("Message not found", 404);

      // Allow sender or group admin to delete
      const member = await queryOne<{ role: string }>(
        `SELECT role FROM conversation_members
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, req.userId]
      );

      const canDelete =
        msg.sender_id === req.userId ||
        ["owner", "admin", "moderator"].includes(member?.role ?? "");

      if (!canDelete) throw createError("Cannot delete this message", 403);

      await query(
        "UPDATE messages SET deleted_at = NOW() WHERE id = $1",
        [msgId]
      );

      await redis.publish(
        `conv:${id}`,
        JSON.stringify({
          type: "message.deleted",
          payload: { id: msgId },
          timestamp: new Date().toISOString(),
        })
      );

      res.json({ data: { message: "Deleted" } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/conversations/:id/leave
router.post("/:id/leave", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const member = await queryOne<{ role: string }>(
      `SELECT role FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (!member) throw createError("Not a member", 404);

    await query(
      `UPDATE conversation_members SET left_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    res.json({ data: { message: "Left conversation" } });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/typing
router.post("/:id/typing", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { isTyping } = z.object({ isTyping: z.boolean() }).parse(req.body);

    // Verify membership
    const member = await queryOne(
      `SELECT id FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );
    if (!member) {
      throw createError("Conversation not found", 404);
    }

    // Set typing indicator in Redis (expire after 10s)
    const key = keys.typingIndicator(id, req.userId!);
    if (isTyping) {
      await redis.setex(key, 10, "1");
    } else {
      await redis.del(key);
    }

    // Publish typing event
    await redis.publish(
      `conv:${id}`,
      JSON.stringify({
        type: "user.typing",
        payload: { conversationId: id, userId: req.userId, isTyping },
        timestamp: new Date().toISOString(),
      })
    );

    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
