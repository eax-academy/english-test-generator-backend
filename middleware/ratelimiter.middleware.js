import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js";

// Helper for creating Redis store
const createRedisStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });

// GLOBAL LIMITER
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
  store: createRedisStore("global"),
});

// 2. AUTH LIMITER
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // 5
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: "Too many authentication attempts. Please try again later.",
    retryAfter: Math.ceil(15 * 60),
  },
  store: createRedisStore("auth"),
});

// 3. REGISTRATION LIMITER (24 hours)
export const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: "Too many accounts created from this IP. Please try again later.",
    retryAfter: Math.ceil(24 * 60 * 60),
  },
  store: createRedisStore("register"),
});

// 4. API LIMITER (for demanding requests, test generation)
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Hourly API limit exceeded. Upgrade your plan for more requests.",
  },
  store: createRedisStore("api"),
});
