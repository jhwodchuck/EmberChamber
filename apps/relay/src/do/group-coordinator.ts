import { DurableObject } from "cloudflare:workers";
import { dbFirst } from "../lib/d1";
import { json } from "../lib/http";

interface GroupState {
  conversationId: string;
  epoch: number;
  memberAccountIds: string[];
}

interface GroupCoordinatorEnv {
  DB: D1Database;
}

interface GroupSocketAttachment {
  conversationId: string;
  accountId: string;
  deviceId: string;
  sessionId: string;
  connectedAt: string;
}

type AttachmentAwareWebSocket = WebSocket & {
  serializeAttachment(attachment: unknown): void;
  deserializeAttachment(): unknown | null;
};

function isGroupSocketAttachment(value: unknown): value is GroupSocketAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.conversationId === "string" &&
    candidate.conversationId.length > 0 &&
    typeof candidate.accountId === "string" &&
    candidate.accountId.length > 0 &&
    typeof candidate.deviceId === "string" &&
    candidate.deviceId.length > 0 &&
    typeof candidate.sessionId === "string" &&
    candidate.sessionId.length > 0 &&
    typeof candidate.connectedAt === "string" &&
    candidate.connectedAt.length > 0
  );
}

export class GroupCoordinatorDO extends DurableObject<GroupCoordinatorEnv> {
  constructor(ctx: DurableObjectState, env: GroupCoordinatorEnv) {
    super(ctx, env);
  }

  private socketAttachment(ws: WebSocket): GroupSocketAttachment | null {
    const attachment = (ws as AttachmentAwareWebSocket).deserializeAttachment();
    return isGroupSocketAttachment(attachment) ? attachment : null;
  }

  private async socketHasConversationAccess(attachment: GroupSocketAttachment): Promise<boolean> {
    const session = await dbFirst<{ id: string }>(
      this.env.DB,
      `SELECT s.id
         FROM sessions s
         JOIN conversation_members cm
           ON cm.account_id = s.account_id
          AND cm.conversation_id = ?4
          AND cm.removed_at IS NULL
        WHERE s.id = ?1
          AND s.account_id = ?2
          AND s.device_id = ?3
          AND s.revoked_at IS NULL
          AND s.expires_at > ?5`,
      attachment.sessionId,
      attachment.accountId,
      attachment.deviceId,
      attachment.conversationId,
      new Date().toISOString(),
    );

    return Boolean(session);
  }

  private closeSocket(ws: WebSocket, code = 4403, reason = "Conversation access expired") {
    try {
      ws.close(code, reason);
    } catch {
      // Ignore close failures on dead sockets.
    }
  }

  private async broadcastToAuthorizedSockets(payload?: string) {
    // @ts-expect-error getWebSockets is available in modern CF DOs
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.socketAttachment(ws);
      const authorized = attachment ? await this.socketHasConversationAccess(attachment) : false;
      if (!authorized) {
        this.closeSocket(ws);
        continue;
      }

      if (!payload) {
        continue;
      }

      try {
        ws.send(payload);
      } catch {
        this.closeSocket(ws, 1011, "Socket send failed");
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") === "websocket") {
        const attachment: GroupSocketAttachment = {
          conversationId: request.headers.get("x-emberchamber-conversation-id") ?? "",
          accountId: request.headers.get("x-emberchamber-account-id") ?? "",
          deviceId: request.headers.get("x-emberchamber-device-id") ?? "",
          sessionId: request.headers.get("x-emberchamber-session-id") ?? "",
          connectedAt: new Date().toISOString(),
        };
        if (!isGroupSocketAttachment(attachment)) {
          return new Response("Missing socket metadata", { status: 400 });
        }

        // @ts-expect-error WebSocketPair is globally available in CF Workers
        const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, AttachmentAwareWebSocket];
        server.serializeAttachment(attachment);
        // @ts-expect-error acceptWebSocket is available in modern CF DOs
        this.ctx.acceptWebSocket(server);
        // @ts-expect-error webSocket is a valid ResponseInit prop in CF
        return new Response(null, { status: 101, webSocket: client });
      }
      return new Response("Expected WebSocket", { status: 426 });
    }

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.text();
      await this.broadcastToAuthorizedSockets(payload);
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/seed") {
      const state = (await request.json()) as GroupState;
      await this.ctx.storage.put("state", state);
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/rotate") {
      const current = (await this.ctx.storage.get<GroupState>("state")) ?? {
        conversationId: "",
        epoch: 1,
        memberAccountIds: [],
      };
      const update = (await request.json()) as Partial<GroupState>;
      const nextState: GroupState = {
        ...current,
        ...update,
        epoch: Math.max(current.epoch, update.epoch ?? current.epoch),
      };
      await this.ctx.storage.put("state", nextState);
      await this.broadcastToAuthorizedSockets();
      return json(nextState);
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const state = (await this.ctx.storage.get<GroupState>("state")) ?? null;
      return json({ state });
    }

    return new Response("Not found", { status: 404 });
  }
}
