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
