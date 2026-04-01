import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

export default redis;

// Key helpers
export const keys = {
  userOnline: (userId: string) => `online:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
  rateLimitAuth: (ip: string) => `rl:auth:${ip}`,
  rateLimitApi: (userId: string) => `rl:api:${userId}`,
  typingIndicator: (convId: string, userId: string) =>
    `typing:${convId}:${userId}`,
  inviteCode: (code: string) => `invite:${code}`,
  messageQueue: (convId: string) => `mq:${convId}`,
};
