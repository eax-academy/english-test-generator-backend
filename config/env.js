import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/english-test-db",
  redisUri:
    process.env.REDIS_URL,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  env: process.env.NODE_ENV || "development",
  // Cookie settings config
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true for https
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

};

if (!config.accessSecret || !config.refreshSecret) {
  throw new Error("FATAL: JWT Secrets are not defined in .env");
}
