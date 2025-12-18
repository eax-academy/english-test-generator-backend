import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import cookieParser from "cookie-parser";
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

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Your Frontend URL
    credentials: true, // Allow cookies to be sent
  })
);

app.use(globalLimiter);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);

// -------------------- Routes --------------------

// Root Route
app.get("/", (req, res) =>
  res.json({ message: "🧠 English Test Generator Backend is running" })
);

// API Routes
app.use("/api/v1/quiz", apiLimiter, quizRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/tests", apiLimiter, testsRouter);
app.use("/api/v1/users", apiLimiter, usersRouter);
app.use("/api/v1/analyze", apiLimiter, analyzeRouter);

// 404 Fallback
app.use((req, res) => res.status(404).json({ message: "Endpoint not found" }));

// Global Error Handling
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// -------------------- Start Server --------------------
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// -------------------- Shutdown --------------------

const handleTermination = async (signal) => {
  console.log(`\n${signal} received. Initiating termination sequence...`);

  const forceExitTimeout = setTimeout(() => {
    console.error("⚠️  Termination timed out. Forcing exit.");
    process.exit(1);
  }, 10000).unref();

  try {
    if (server) {
      // Stop accepting new requests
      server.close(async () => {
        console.log("🔒 HTTP server closed");
        try {
          await disconnectDB();
          await disconnectRedis();
          console.log("Database disconnected");
          process.exit(0);
        } catch (err) {
          console.error("Error during database disconnect:", err);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Error during server closure:", err);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => handleTermination("SIGTERM"));
process.on("SIGINT", () => handleTermination("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  handleTermination("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  handleTermination("UNHANDLED_REJECTION");
});
