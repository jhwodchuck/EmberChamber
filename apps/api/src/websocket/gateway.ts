import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import Redis from "ioredis";
import { verifyAccessToken } from "../utils/jwt";
import { queryOne, query } from "../db/client";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  subscribedChannels: Set<string>;
  isAlive: boolean;
}

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// Create a separate Redis subscriber instance
const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// Map: channelKey -> Set of WebSocket connections
const subscriptions = new Map<string, Set<AuthenticatedWebSocket>>();

function subscribe(key: string, ws: AuthenticatedWebSocket): void {
  if (!subscriptions.has(key)) {
    subscriptions.set(key, new Set());
    // Subscribe to Redis pub/sub channel
    subscriber.subscribe(key).catch(console.error);
  }
  subscriptions.get(key)!.add(ws);
  ws.subscribedChannels.add(key);
}

function unsubscribe(key: string, ws: AuthenticatedWebSocket): void {
  const subs = subscriptions.get(key);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscriptions.delete(key);
      subscriber.unsubscribe(key).catch(console.error);
    }
  }
  ws.subscribedChannels.delete(key);
}

function cleanupConnection(ws: AuthenticatedWebSocket): void {
  for (const channel of ws.subscribedChannels) {
    unsubscribe(channel, ws);
  }
}

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Fan out Redis pub/sub messages to connected clients
subscriber.on("message", (channel: string, message: string) => {
  const subs = subscriptions.get(channel);
  if (!subs || subs.size === 0) return;

  try {
    JSON.parse(message);
  } catch {
    return;
  }

  for (const client of subs) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

subscriber.on("error", (err) => {
  console.error("Redis subscriber error:", err);
});

export function createWebSocketServer(wss: WebSocketServer): WebSocketServer {
  // Heartbeat ping interval
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients as Set<AuthenticatedWebSocket>) {
      if (!ws.isAlive) {
        cleanupConnection(ws);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", async (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as AuthenticatedWebSocket;
    ws.subscribedChannels = new Set();
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Authenticate via query param or first message
    const url = new URL(req.url ?? "/", "ws://localhost");
    const token = url.searchParams.get("token");

    if (token) {
      try {
        const payload = verifyAccessToken(token);

        // Verify session
        const session = await queryOne<{ id: string; user_id: string }>(
          `SELECT id, user_id FROM sessions
           WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
          [payload.sessionId],
        );

        if (session) {
          ws.userId = payload.sub;
          ws.sessionId = payload.sessionId;
          send(ws, { type: "connected", payload: { userId: ws.userId } });

          // Auto-subscribe to user's conversations and channels
          await autoSubscribe(ws);
        } else {
          send(ws, { type: "error", payload: { message: "Invalid session" } });
          ws.close(4401, "Unauthorized");
          return;
        }
      } catch {
        send(ws, { type: "error", payload: { message: "Invalid token" } });
        ws.close(4401, "Unauthorized");
        return;
      }
    } else {
      send(ws, {
        type: "error",
        payload: { message: "Authentication required" },
      });
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.on("message", async (data) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(data.toString()) as WSMessage;
      } catch {
        send(ws, {
          type: "error",
          payload: { message: "Invalid message format" },
        });
        return;
      }

      await handleClientMessage(ws, msg);
    });

    ws.on("close", () => {
      cleanupConnection(ws);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      cleanupConnection(ws);
    });
  });

  return wss;
}

async function autoSubscribe(ws: AuthenticatedWebSocket): Promise<void> {
  if (!ws.userId) return;

  // Subscribe to conversations
  const conversations = await query<{ conversation_id: string }>(
    `SELECT conversation_id FROM conversation_members
     WHERE user_id = $1 AND left_at IS NULL`,
    [ws.userId],
  );

  for (const { conversation_id } of conversations) {
    subscribe(`conv:${conversation_id}`, ws);
  }

  // Subscribe to channels
  const channels = await query<{ channel_id: string }>(
    `SELECT channel_id FROM channel_members
     WHERE user_id = $1 AND left_at IS NULL`,
    [ws.userId],
  );

  for (const { channel_id } of channels) {
    subscribe(`channel:${channel_id}`, ws);
  }

  // Subscribe to user-specific events
  subscribe(`user:${ws.userId}`, ws);
}

async function handleClientMessage(
  ws: AuthenticatedWebSocket,
  msg: WSMessage,
): Promise<void> {
  if (!ws.userId) {
    send(ws, { type: "error", payload: { message: "Not authenticated" } });
    return;
  }

  switch (msg.type) {
    case "subscribe.conversation": {
      const convId = msg.payload?.conversationId as string;
      if (!convId) break;

      // Verify membership
      const member = await queryOne(
        `SELECT id FROM conversation_members
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [convId, ws.userId],
      );
      if (member) {
        subscribe(`conv:${convId}`, ws);
        send(ws, { type: "subscribed", payload: { conversationId: convId } });
      }
      break;
    }

    case "subscribe.channel": {
      const chanId = msg.payload?.channelId as string;
      if (!chanId) break;

      const member = await queryOne(
        `SELECT id FROM channel_members
         WHERE channel_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [chanId, ws.userId],
      );
      if (member) {
        subscribe(`channel:${chanId}`, ws);
        send(ws, { type: "subscribed", payload: { channelId: chanId } });
      }
      break;
    }

    case "ping":
      send(ws, {
        type: "pong",
        payload: { timestamp: new Date().toISOString() },
      });
      break;

    default:
      send(ws, {
        type: "error",
        payload: { message: `Unknown message type: ${msg.type}` },
      });
  }
}
