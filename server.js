import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import {
  globalLimiter,
  apiLimiter,
} from "./middleware/ratelimiter.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import adminRouter from "./routes/admin.routes.js";
import testsRouter from "./routes/tests.routes.js";
import usersRouter from "./routes/users.routes.js";
import analyzeRouter from "./routes/analyze.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";

import { config } from "./config/env.js";


const app = express();

// -------------------- Middlewares --------------------
app.use(
  cors({
    origin: ["http://localhost:5173"], // Frontend URL(s)
    credentials: true,                 // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"],   // Allowed headers
  })
);

// Global middlewares
app.use(globalLimiter);
app.use(morgan("dev"));
app.use(express.json());
app.use(loggerMiddleware);

// -------------------- Routes --------------------
// Quiz routes
app.use("/api/v1/quiz", apiLimiter, quizRoutes);

// Auth routes
app.use("/api/v1/auth", authRoutes);

// Admin routes
app.use("/api/v1/admin", adminRouter);

// Tests routes
app.use("/api/v1/tests", apiLimiter, testsRouter);

// Users routes
app.use("/api/v1/users", apiLimiter, usersRouter);

// Analyze routes
app.use("/api/v1/analyze", apiLimiter, analyzeRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ message: "Endpoint not found" }));

app.get("/", (req, res) =>
  res.json({ message: "🧠 English Test Generator Backend is running" })
);

// Error Handling
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = config.port || 5000;
const server = app.listen(PORT, () => console.log(`🚀Server is running on port: ${PORT}`));

await connectDB();
await connectRedis();

const handleTermination = async (signal) => {
  console.log(`\n${signal} received. Initiating termination sequence...`);

  const forceExitTimeout = setTimeout(() => {
    console.error("⚠️  Termination timed out. Forcing exit.");
    process.exit(1);
  }, 10000).unref();

  try {
    // Stop accepting new requests
    server.close(async () => {
      console.log("🔒 HTTP server closed");

      try {
        await disconnectDB();
        await disconnectRedis();
        console.log("Database disconnected");
        process.exit(0); // Clean exit
      } catch (err) {
        console.error("Error during database disconnect:", err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("Error during server closure:", err);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => handleTermination("SIGTERM")); // For Cloud/Docker stops
process.on("SIGINT", () => handleTermination("SIGINT")); // For Ctrl + C in terminal

// Optional: Handle unexpected crashes
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  handleTermination("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  handleTermination("UNHANDLED_REJECTION");
});
