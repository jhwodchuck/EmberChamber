import { DurableObject } from "cloudflare:workers";
import type { CipherEnvelope } from "@emberchamber/protocol";
import { json } from "../lib/http";

const STATE_KEY = "state";
const ENVELOPE_KEY_PREFIX = "envelope:";
const MAX_MAILBOX_BACKLOG = 500;

interface MailboxStats {
  enqueued: number;
  acknowledged: number;
  expired: number;
  rejected: number;
}

interface DeviceMailboxState {
  queue: string[];
  stats: MailboxStats;
}

function defaultState(): DeviceMailboxState {
  return {
    queue: [],
    stats: {
      enqueued: 0,
      acknowledged: 0,
      expired: 0,
      rejected: 0,
    },
  };
}

export class DeviceMailboxDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  private async loadState(): Promise<DeviceMailboxState> {
    return (await this.ctx.storage.get<DeviceMailboxState>(STATE_KEY)) ?? defaultState();
  }

  private async saveState(state: DeviceMailboxState) {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  private async scheduleNextAlarm(state: DeviceMailboxState) {
    const expirations = await Promise.all(
      state.queue.map(async (envelopeId) => {
        const envelope = await this.ctx.storage.get<CipherEnvelope>(`${ENVELOPE_KEY_PREFIX}${envelopeId}`);
        return envelope ? Date.parse(envelope.expiresAt) : null;
      }),
    );
    const next = expirations.filter((value): value is number => value !== null).sort((a, b) => a - b)[0];

    if (next) {
      await this.ctx.storage.setAlarm(next);
      return;
    }

    await this.ctx.storage.deleteAlarm();
  }

  private async pruneExpired(state: DeviceMailboxState, now = Date.now()) {
    const nextQueue: string[] = [];

    for (const envelopeId of state.queue) {
      const key = `${ENVELOPE_KEY_PREFIX}${envelopeId}`;
      const envelope = await this.ctx.storage.get<CipherEnvelope>(key);
      if (!envelope) {
        continue;
      }

      if (Date.parse(envelope.expiresAt) <= now) {
        state.stats.expired += 1;
        await this.ctx.storage.delete(key);
        continue;
      }

      nextQueue.push(envelopeId);
    }

    state.queue = nextQueue;
    await this.saveState(state);
    await this.scheduleNextAlarm(state);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/enqueue") {
      const { envelope } = (await request.json()) as { envelope: CipherEnvelope };
      const state = await this.loadState();
      await this.pruneExpired(state);

      if (state.queue.includes(envelope.envelopeId)) {
        return json({ queued: true, envelopeId: envelope.envelopeId, duplicate: true });
      }

      if (state.queue.length >= MAX_MAILBOX_BACKLOG) {
        state.stats.rejected += 1;
        await this.saveState(state);
        return json(
          {
            queued: false,
            envelopeId: envelope.envelopeId,
            code: "MAILBOX_BACKLOG_EXCEEDED",
          },
          { status: 409 },
        );
      }

      state.queue.push(envelope.envelopeId);
      state.stats.enqueued += 1;
      await this.ctx.storage.put(`${ENVELOPE_KEY_PREFIX}${envelope.envelopeId}`, envelope);
      await this.saveState(state);
      await this.scheduleNextAlarm(state);
      return json({ queued: true, envelopeId: envelope.envelopeId });
    }

    if (request.method === "GET" && url.pathname === "/sync") {
      const after = url.searchParams.get("after");
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50")));
      const state = await this.loadState();
      await this.pruneExpired(state);
      const startIndex = after ? state.queue.indexOf(after) + 1 : 0;
      const selectedIds = state.queue.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);
      const envelopes = await Promise.all(
        selectedIds.map((id) => this.ctx.storage.get<CipherEnvelope>(`${ENVELOPE_KEY_PREFIX}${id}`))
      );

      return json({
        cursor: { lastSeenEnvelopeId: selectedIds[selectedIds.length - 1] },
        envelopes: envelopes.filter(Boolean),
        stats: {
          ...state.stats,
          queued: state.queue.length,
        },
      });
    }

    if (request.method === "POST" && url.pathname === "/ack") {
      const { envelopeIds } = (await request.json()) as { envelopeIds: string[] };
      const state = await this.loadState();
      await this.pruneExpired(state);
      const existingIds = new Set(state.queue);
      const acknowledgedIds = envelopeIds.filter((envelopeId) => existingIds.has(envelopeId));
      state.queue = state.queue.filter((envelopeId) => !envelopeIds.includes(envelopeId));
      state.stats.acknowledged += acknowledgedIds.length;
      await Promise.all(
        acknowledgedIds.map((envelopeId) => this.ctx.storage.delete(`${ENVELOPE_KEY_PREFIX}${envelopeId}`)),
      );
      await this.saveState(state);
      await this.scheduleNextAlarm(state);
      return json({ acknowledged: acknowledgedIds.length });
    }

    return new Response("Not found", { status: 404 });
  }

  async alarm(): Promise<void> {
    const state = await this.loadState();
    await this.pruneExpired(state);
  }
}
