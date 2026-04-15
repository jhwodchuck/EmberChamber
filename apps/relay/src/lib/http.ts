import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

function normalizeAllowedOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(
  request: Request,
  allowedOriginsRaw: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };

  const origin = request.headers.get("origin");
  const allowedOrigins = normalizeAllowedOrigins(allowedOriginsRaw);
  if (
    origin &&
    (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
  ) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}

export function withCors(
  response: Response,
  request: Request,
  allowedOriginsRaw: string,
): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request, allowedOriginsRaw);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function preflightResponse(
  request: Request,
  allowedOriginsRaw: string,
): Response {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, allowedOriginsRaw),
  });
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: "Invalid request body",
        code: "INVALID_REQUEST",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error("relay_error", error);
  return json({ error: "Internal server error" }, { status: 500 });
}
