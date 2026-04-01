import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import http from "http";
import { WebSocketServer } from "ws";

import authRouter from "./routes/auth";
import conversationsRouter from "./routes/conversations";
import channelsRouter from "./routes/channels";
import usersRouter from "./routes/users";
import invitesRouter from "./routes/invites";
import attachmentsRouter from "./routes/attachments";
import searchRouter from "./routes/search";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { createWebSocketServer } from "./websocket/gateway";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.set("trust proxy", 1);

// ─── Global rate limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts" },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/channels", channelsRouter);
app.use("/api/users", usersRouter);
app.use("/api/invites", invitesRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/search", searchRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });
createWebSocketServer(wss);

server.listen(PORT, () => {
  console.log(`PrivateMesh API listening on port ${PORT}`);
  console.log(`WebSocket server listening on ws://localhost:${PORT}/ws`);
});

export { app, server };
