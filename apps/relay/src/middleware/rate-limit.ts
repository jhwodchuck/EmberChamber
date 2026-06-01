import type { Env } from "../types";
import { HttpError } from "../lib/http";

export async function enforceRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const id = env.RATE_LIMITER.idFromName(key);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch("https://do/check", {
    method: "POST",
    body: JSON.stringify({ key, limit, windowMs }),
  });
  const data = (await response.json()) as { allowed: boolean };
  if (!data.allowed) {
    throw new HttpError(429, "Rate limit exceeded", "RATE_LIMITED");
  }
}
