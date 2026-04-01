import { Router, Response } from "express";
import { z } from "zod";
import { query } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const SearchSchema = z.object({
  q: z.string().min(2).max(256),
  type: z.enum(["messages", "channels", "users", "all"]).default("all"),
  conversationId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// GET /api/search
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const params = SearchSchema.parse(req.query);
    const results: Record<string, unknown[]> = {};

    if (params.type === "all" || params.type === "messages") {
      // Search messages in conversations the user is a member of
      const messages = await query(
        `SELECT m.id, m.conversation_id, m.content, m.created_at,
                u.username, u.display_name, u.avatar_url,
                c.type as conv_type, c.name as conv_name
         FROM messages m
         INNER JOIN users u ON u.id = m.sender_id
         INNER JOIN conversations c ON c.id = m.conversation_id
         INNER JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
         WHERE cm.user_id = $1
           AND cm.left_at IS NULL
           AND m.deleted_at IS NULL
           AND m.content IS NOT NULL
           ${params.conversationId ? "AND m.conversation_id = $3" : ""}
           AND to_tsvector('english', m.content)
               @@ plainto_tsquery('english', $2)
         ORDER BY m.created_at DESC
         LIMIT $${params.conversationId ? 4 : 3}`,
        params.conversationId
          ? [req.userId, params.q, params.conversationId, params.limit]
          : [req.userId, params.q, params.limit]
      );
      results.messages = messages;
    }

    if (params.type === "all" || params.type === "channels") {
      const channels = await query(
        `SELECT id, name, slug, description, visibility, member_count
         FROM channels
         WHERE visibility = 'public' AND archived_at IS NULL
           AND to_tsvector('english', name || ' ' || COALESCE(description, ''))
               @@ plainto_tsquery('english', $1)
         ORDER BY member_count DESC
         LIMIT $2`,
        [params.q, params.limit]
      );
      results.channels = channels;
    }

    if (params.type === "all" || params.type === "users") {
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
         LIMIT $3`,
        [req.userId, params.q, params.limit]
      );
      results.users = users;
    }

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
