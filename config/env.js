import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/english-test-generator",
  redisUri: process.env.REDIS_URL,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  env: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY,
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

if (!config.accessSecret || !config.refreshSecret) {
  throw new Error("FATAL: JWT Secrets are not defined in .env. Check if the path to .env is correct.");
}