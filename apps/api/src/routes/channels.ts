import { Router, Response } from "express";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import redis from "../db/redis";

const router = Router();
router.use(authenticate);

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  visibility: z.enum(["public", "private"]).default("private"),
});

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

const CreatePostSchema = z.object({
  content: z.string().min(1).max(4096).optional(),
  attachmentId: z.string().uuid().optional(),
});

// GET /api/channels - discover/search public channels
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    let channels;
    if (search) {
      channels = await query(
        `SELECT id, name, slug, description, avatar_url, visibility, member_count, post_count, created_at
         FROM channels
         WHERE visibility = 'public' AND archived_at IS NULL
           AND to_tsvector('english', name || ' ' || COALESCE(description, ''))
               @@ plainto_tsquery('english', $1)
         ORDER BY member_count DESC
         LIMIT $2`,
        [search, limit]
      );
    } else {
      channels = await query(
        `SELECT id, name, slug, description, avatar_url, visibility, member_count, post_count, created_at
         FROM channels
         WHERE visibility = 'public' AND archived_at IS NULL
         ORDER BY member_count DESC
         LIMIT $1`,
        [limit]
      );
    }

    res.json({ data: channels });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/me - channels I'm subscribed to
router.get("/me", async (req: AuthRequest, res: Response, next) => {
  try {
    const channels = await query(
      `SELECT c.id, c.name, c.slug, c.description, c.avatar_url,
              c.visibility, c.member_count, c.post_count, c.updated_at,
              cm.role
       FROM channels c
       INNER JOIN channel_members cm ON cm.channel_id = c.id
       WHERE cm.user_id = $1 AND cm.left_at IS NULL AND c.archived_at IS NULL
       ORDER BY c.updated_at DESC`,
      [req.userId]
    );

    res.json({ data: channels });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels - create channel
router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = CreateChannelSchema.parse(req.body);

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);

    const channel = await withTransaction(async (client) => {
      // Ensure unique slug
      let finalSlug = slug;
      const existing = await client.query(
        "SELECT id FROM channels WHERE slug = $1",
        [slug]
      );
      if (existing.rows.length > 0) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      const { rows } = await client.query(
        `INSERT INTO channels (name, slug, description, visibility, owner_id, member_count)
         VALUES ($1, $2, $3, $4, $5, 1)
         RETURNING id, name, slug, description, visibility, created_at`,
        [body.name, finalSlug, body.description ?? null, body.visibility, req.userId]
      );
      const channel = rows[0];

      // Add owner as member
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [channel.id, req.userId]
      );

      return channel;
    });

    res.status(201).json({ data: channel });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/:id
router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const channel = await queryOne<{
      id: string;
      name: string;
      slug: string;
      description: string;
      avatar_url: string;
      visibility: string;
      owner_id: string;
      member_count: number;
      post_count: number;
      created_at: string;
    }>(
      `SELECT id, name, slug, description, avatar_url, visibility, owner_id,
              member_count, post_count, created_at
       FROM channels WHERE id = $1 AND archived_at IS NULL`,
      [id]
    );

    if (!channel) throw createError("Channel not found", 404);

    // For private channels, verify membership
    if (channel.visibility === "private") {
      const member = await queryOne(
        `SELECT id FROM channel_members
         WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, req.userId]
      );
      if (!member) throw createError("Channel not found", 404);
    }

    // Get current user's membership info
    const myMembership = await queryOne<{ role: string }>(
      `SELECT role FROM channel_members
       WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    res.json({ data: { ...channel, myRole: myMembership?.role ?? null } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/channels/:id
router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = UpdateChannelSchema.parse(req.body);

    const member = await queryOne<{ role: string }>(
      `SELECT role FROM channel_members
       WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (!member) throw createError("Channel not found", 404);
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
    if (body.visibility !== undefined) {
      updates.push(`visibility = $${paramIdx++}`);
      params.push(body.visibility);
    }

    if (updates.length === 0) throw createError("No fields to update", 400);

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE channels SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
      params
    );

    res.json({ data: { message: "Updated" } });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/:id/join
router.post("/:id/join", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const channel = await queryOne<{ id: string; visibility: string }>(
      "SELECT id, visibility FROM channels WHERE id = $1 AND archived_at IS NULL",
      [id]
    );

    if (!channel) throw createError("Channel not found", 404);
    if (channel.visibility === "private") {
      throw createError("This channel requires an invite", 403, "INVITE_REQUIRED");
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES ($1, $2, 'subscriber')
         ON CONFLICT (channel_id, user_id) DO UPDATE SET left_at = NULL`,
        [id, req.userId]
      );

      await client.query(
        "UPDATE channels SET member_count = member_count + 1 WHERE id = $1",
        [id]
      );
    });

    res.json({ data: { message: "Joined channel" } });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/:id/leave
router.post("/:id/leave", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const member = await queryOne<{ role: string }>(
      `SELECT role FROM channel_members
       WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (!member) throw createError("Not a member", 404);
    if (member.role === "owner") {
      throw createError("Owners cannot leave. Transfer ownership first.", 400);
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE channel_members SET left_at = NOW()
         WHERE channel_id = $1 AND user_id = $2`,
        [id, req.userId]
      );

      await client.query(
        "UPDATE channels SET member_count = GREATEST(0, member_count - 1) WHERE id = $1",
        [id]
      );
    });

    res.json({ data: { message: "Left channel" } });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/:id/posts
router.get("/:id/posts", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const before = req.query.before as string | undefined;

    const channel = await queryOne<{ visibility: string }>(
      "SELECT visibility FROM channels WHERE id = $1 AND archived_at IS NULL",
      [id]
    );

    if (!channel) throw createError("Channel not found", 404);

    if (channel.visibility === "private") {
      const member = await queryOne(
        `SELECT id FROM channel_members
         WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, req.userId]
      );
      if (!member) throw createError("Channel not found", 404);
    }

    const posts = await query(
      `SELECT p.id, p.channel_id, p.author_id, p.content, p.attachment_id,
              p.edited_at, p.deleted_at, p.created_at,
              u.username, u.display_name, u.avatar_url,
              (SELECT COUNT(*) FROM channel_post_reactions WHERE post_id = p.id) as reaction_count
       FROM channel_posts p
       INNER JOIN users u ON u.id = p.author_id
       WHERE p.channel_id = $1
         ${before ? "AND p.created_at < $3" : ""}
       ORDER BY p.created_at DESC
       LIMIT $2`,
      before ? [id, limit, before] : [id, limit]
    );

    res.json({ data: posts.reverse() });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/:id/posts
router.post("/:id/posts", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = CreatePostSchema.parse(req.body);

    if (!body.content && !body.attachmentId) {
      throw createError("Post must have content or attachment", 400);
    }

    const member = await queryOne<{ role: string }>(
      `SELECT role FROM channel_members
       WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (!member) throw createError("Not a member", 403);

    // Only owner/admin/moderator can post
    if (!["owner", "admin", "moderator"].includes(member.role)) {
      throw createError("Only channel administrators can post", 403, "NOT_PUBLISHER");
    }

    const post = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO channel_posts (channel_id, author_id, content, attachment_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, channel_id, author_id, content, attachment_id, created_at`,
        [id, req.userId, body.content ?? null, body.attachmentId ?? null]
      );

      await client.query(
        `UPDATE channels SET post_count = post_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      return rows[0];
    });

    // Publish to Redis
    await redis.publish(
      `channel:${id}`,
      JSON.stringify({
        type: "channel.post.new",
        payload: post,
        timestamp: new Date().toISOString(),
      })
    );

    res.status(201).json({ data: post });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/channels/:id/posts/:postId
router.delete(
  "/:id/posts/:postId",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id, postId } = req.params;

      const post = await queryOne<{ author_id: string }>(
        `SELECT author_id FROM channel_posts
         WHERE id = $1 AND channel_id = $2 AND deleted_at IS NULL`,
        [postId, id]
      );

      if (!post) throw createError("Post not found", 404);

      const member = await queryOne<{ role: string }>(
        `SELECT role FROM channel_members
         WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, req.userId]
      );

      const canDelete =
        post.author_id === req.userId ||
        ["owner", "admin", "moderator"].includes(member?.role ?? "");

      if (!canDelete) throw createError("Cannot delete this post", 403);

      await query(
        "UPDATE channel_posts SET deleted_at = NOW() WHERE id = $1",
        [postId]
      );

      res.json({ data: { message: "Deleted" } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
