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

import { startWordWorker, stopWordWorker } from "./queues/startWorker.js";
import { scheduleDatabaseCheck, closeQueue } from "./queues/scheduler.js";

import authRoutes from "./routes/auth.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import adminRouter from "./routes/admin.routes.js";
import testsRouter from "./routes/tests.routes.js";
import usersRouter from "./routes/users.routes.js";
//TODO: analyze route change isAdmin
import analyzeRouter from "./routes/analyze.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";

import { config } from "./config/env.js";
const app = express();
const PORT = config.port || 5000;
let server;

// Middleware
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, etc.)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);


app.use(globalLimiter);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(loggerMiddleware);

// Root Route
app.get("/", (req, res) =>
  res.json({ message: "🧠 English Test Generator Backend is running" })
);

// API Routes
app.use("/api/v1/quiz", quizRoutes); //apiLimiter, quizRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/tests", apiLimiter, testsRouter);
app.use("/api/v1/users", apiLimiter, usersRouter);
//TODO: ONLY ADMIN analyze route
app.use("/api/v1/analyze", apiLimiter, analyzeRouter);

// 404 Fallback
app.use((req, res) => res.status(404).json({ message: "Endpoint not found" }));

// Global Error Handling
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start server
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

// Shut down server
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
