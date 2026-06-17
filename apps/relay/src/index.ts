import { z } from "zod";
import { DeviceMailboxDO } from "./do/device-mailbox";
import { GroupCoordinatorDO } from "./do/group-coordinator";
import { RateLimitDO } from "./do/rate-limit";
import { errorResponse, HttpError, json, preflightResponse, withCors } from "./lib/http";
import * as system from "./handlers/system";
import * as admin from "./handlers/admin";
import * as operator from "./handlers/operator";
import * as auth from "./handlers/auth";
import * as me from "./handlers/me";
import * as devices from "./handlers/devices";
import * as contacts from "./handlers/contacts";
import * as conversations from "./handlers/conversations";
import * as messages from "./handlers/messages";
import * as attachments from "./handlers/attachments";
import * as reports from "./handlers/reports";
import * as push from "./handlers/push";
import * as passkeys from "./handlers/passkeys";
import { consumeQueue } from "./handlers/queue";
import type { Env } from "./types";

const handlers = [
  system,
  admin,
  operator,
  auth,
  passkeys,
  me,
  devices,
  contacts,
  conversations,
  messages,
  attachments,
  reports,
  push,
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const requestId =
      request.headers.get("cf-ray") ??
      request.headers.get("x-request-id") ??
      crypto.randomUUID();
    const url = new URL(request.url);
    const pathname = url.pathname;

    const logResponse = (response: Response, code?: string) => {
      console.info(
        JSON.stringify({
          event: "relay_request",
          requestId,
          method: request.method,
          path: pathname,
          status: response.status,
          durationMs: Date.now() - startedAt,
          code,
        }),
      );
    };

    try {
      if (request.method === "OPTIONS") {
        return preflightResponse(request, env.EMBERCHAMBER_ALLOWED_ORIGINS);
      }

      const respond = (response: Response, code?: string) => {
        const headers = new Headers(response.headers);
        headers.set("x-request-id", requestId);
        const nextResponse = withCors(
          new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          }),
          request,
          env.EMBERCHAMBER_ALLOWED_ORIGINS,
        );
        logResponse(nextResponse, code);
        return nextResponse;
      };

      for (const handler of handlers) {
        const result = await handler.handle(request, env, url);
        if (result !== null) {
          // WebSocket upgrade responses (status 101) cannot be reconstructed
          // with new Response() — return them directly without CORS wrapping.
          if (result.status === 101) return result;
          return respond(result);
        }
      }
      return respond(json({ error: "Not found" }, { status: 404 }));
    } catch (error) {
      const code =
        error instanceof HttpError
          ? error.code
          : error instanceof z.ZodError
            ? "INVALID_REQUEST"
            : "INTERNAL_ERROR";
      const response = errorResponse(error);
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);
      const nextResponse = withCors(
        new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
        request,
        env.EMBERCHAMBER_ALLOWED_ORIGINS,
      );
      logResponse(nextResponse, code);
      return nextResponse;
    }
  },
  queue: consumeQueue,
};

export { DeviceMailboxDO, GroupCoordinatorDO, RateLimitDO };
