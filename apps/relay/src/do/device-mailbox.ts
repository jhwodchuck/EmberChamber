import { DurableObject } from "cloudflare:workers";
import type { CipherEnvelope } from "@emberchamber/protocol";
import { json } from "../lib/http";

interface DeviceMailboxState {
  queue: string[];
}

export class DeviceMailboxDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/enqueue") {
      const { envelope } = (await request.json()) as { envelope: CipherEnvelope };
      const queue = (await this.ctx.storage.get<DeviceMailboxState>("state")) ?? { queue: [] };
      queue.queue.push(envelope.envelopeId);
      await this.ctx.storage.put(`envelope:${envelope.envelopeId}`, envelope);
      await this.ctx.storage.put("state", queue);
      return json({ queued: true, envelopeId: envelope.envelopeId });
    }

    if (request.method === "GET" && url.pathname === "/sync") {
      const after = url.searchParams.get("after");
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50")));
      const state = (await this.ctx.storage.get<DeviceMailboxState>("state")) ?? { queue: [] };
      const startIndex = after ? state.queue.indexOf(after) + 1 : 0;
      const selectedIds = state.queue.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);
      const envelopes = await Promise.all(
        selectedIds.map((id) => this.ctx.storage.get<CipherEnvelope>(`envelope:${id}`))
      );

      return json({
        cursor: { lastSeenEnvelopeId: selectedIds[selectedIds.length - 1] },
        envelopes: envelopes.filter(Boolean),
      });
    }

    if (request.method === "POST" && url.pathname === "/ack") {
      const { envelopeIds } = (await request.json()) as { envelopeIds: string[] };
      const state = (await this.ctx.storage.get<DeviceMailboxState>("state")) ?? { queue: [] };
      state.queue = state.queue.filter((envelopeId) => !envelopeIds.includes(envelopeId));
      await Promise.all(envelopeIds.map((envelopeId) => this.ctx.storage.delete(`envelope:${envelopeId}`)));
      await this.ctx.storage.put("state", state);
      return json({ acknowledged: envelopeIds.length });
    }

    return new Response("Not found", { status: 404 });
  }
}
