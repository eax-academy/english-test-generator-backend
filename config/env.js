// import dotenv from "dotenv";
// dotenv.config();

// export const config = {
//   port: process.env.PORT || 3000,
//   mongoUri:
//     process.env.MONGO_URI || "mongodb://localhost:27017/english-test-generator",
//   redisUri: process.env.REDIS_URL,
//   accessSecret: process.env.ACCESS_TOKEN_SECRET,
//   refreshSecret: process.env.REFRESH_TOKEN_SECRET,
//   env: process.env.NODE_ENV || "development",
//   geminiApiKey: process.env.GEMINI_API_KEY,

//   // Cookie settings config
//   cookieOptions: {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production", // true for https
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   },
// };

// if (!config.accessSecret || !config.refreshSecret) {
//   throw new Error("FATAL: JWT Secrets are not defined in .env");
// }
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// These lines help Node find the root directory in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This tells dotenv to look 1 level up from the config folder for the .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/english-test-generator",
  redisUri: process.env.REDIS_URL,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  env: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY,

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

// Debugging line (temporary):
// console.log("Loaded API Key:", config.geminiApiKey ? "YES" : "NO");

if (!config.accessSecret || !config.refreshSecret) {
  throw new Error("FATAL: JWT Secrets are not defined in .env. Check if the path to .env is correct.");
}