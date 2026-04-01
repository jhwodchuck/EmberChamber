import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      details[key] = details[key] ?? [];
      details[key].push(issue.message);
    }
    res.status(400).json({ error: "Validation error", details });
    return;
  }

  console.error(err);
  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 ? "Internal server error" : err.message;
  res.status(statusCode).json({ error: message, code: err.code });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
