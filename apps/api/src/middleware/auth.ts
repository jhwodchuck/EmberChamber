import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { queryOne } from "../db/client";

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);

    // Verify the session still exists and is valid
    const session = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM sessions
       WHERE id = $1 AND user_id = $2
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [payload.sessionId, payload.sub]
    );

    if (!session) {
      res.status(401).json({ error: "Session expired or revoked" });
      return;
    }

    // Verify user is not suspended
    const user = await queryOne<{ id: string; is_suspended: boolean }>(
      "SELECT id, is_suspended FROM users WHERE id = $1 AND deleted_at IS NULL",
      [payload.sub]
    );

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.is_suspended) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    req.userId = payload.sub;
    req.sessionId = payload.sessionId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.sessionId = payload.sessionId;
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}
