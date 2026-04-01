import { DurableObject } from "cloudflare:workers";
import { json } from "../lib/http";

interface CounterState {
  count: number;
  resetAt: number;
}

export class RateLimitDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/check") {
      return new Response("Not found", { status: 404 });
    }

    const { key, limit, windowMs } = (await request.json()) as {
      key: string;
      limit: number;
      windowMs: number;
    };
    const now = Date.now();
    const state = (await this.ctx.storage.get<CounterState>(key)) ?? {
      count: 0,
      resetAt: now + windowMs,
    };

    const current =
      state.resetAt <= now
        ? {
            count: 0,
            resetAt: now + windowMs,
          }
        : state;

    current.count += 1;
    await this.ctx.storage.put(key, current);

    return json({
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: new Date(current.resetAt).toISOString(),
    });
  }
}
