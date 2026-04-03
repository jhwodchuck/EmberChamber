import { DurableObject } from "cloudflare:workers";
import { json } from "../lib/http";

interface GroupState {
  conversationId: string;
  epoch: number;
  memberAccountIds: string[];
}

export class GroupCoordinatorDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") === "websocket") {
        // @ts-expect-error WebSocketPair is globally available in CF Workers
        const [client, server] = Object.values(new WebSocketPair());
        // @ts-expect-error acceptWebSocket is available in modern CF DOs
        this.ctx.acceptWebSocket(server);
        // @ts-expect-error webSocket is a valid ResponseInit prop in CF
        return new Response(null, { status: 101, webSocket: client });
      }
      return new Response("Expected WebSocket", { status: 426 });
    }

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.text();
      // @ts-expect-error getWebSockets is available in modern CF DOs
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(payload);
        } catch (err) {
          // Ignore closed sockets
        }
      }
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
      return json(nextState);
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const state = (await this.ctx.storage.get<GroupState>("state")) ?? null;
      return json({ state });
    }

    return new Response("Not found", { status: 404 });
  }
}
