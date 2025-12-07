import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import express from "express";
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

dotenv.config();
const app = express();
app.set("trust proxy", 1);
// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(globalLimiter);
app.use(loggerMiddleware);
// Initialize connections and start server
let server;

// Routes
app.use("/api/v1", globalLimiter, authRoutes); // /api/v1/register, /api/v1/login
app.use("/api/quiz", apiLimiter, quizRoutes);//apiLimiter, quizRoutes); //TODO: add (apiLimiter, testsRouter);
app.use("/api/v1", adminRouter);
app.use("/api/v1/tests", apiLimiter, testsRouter);
app.use("/api/v1/users", apiLimiter, usersRouter);
app.use("/api/v1/", apiLimiter, analyzeRouter); //apiLimiter,analyzeRouter);

app.get("/", (req, res) =>
  res.json({ message: ":brain: English Test Generator Backend is running" })
);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(":x: Error:", err.message);
  // Handle rate limit errors specifically
  if (err.status === 429) {
    return res.status(429).json({
      error: "Too many requests",
      retryAfter: err.retryAfter,
    });
  }
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => console.log(`:white_tick: Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  // Stop accepting new connections
  server.close(async () => {
    console.log(":lock: HTTP server closed");
    // Close database and Redis connections
    try {
      await disconnectDB();
      await disconnectRedis();
      console.log(":wave: All connections closed");
      process.exit(0);
    } catch (error) {
      console.error(":x: Error during shutdown:", error);
      process.exit(1);
    }
  });
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error(":warning:  Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};
// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); //SIGINT → Ctrl + C
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // process termination system (e.g. Docker or PM2)