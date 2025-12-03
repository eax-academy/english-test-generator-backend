import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import adminRouter from "./routes/admin.routes.js";
import testsRouter from "./routes/tests.routes.js";
import usersRouter from "./routes/users.routes.js";
import analyzeRouter from "./routes/analyze.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
connectDB();

// Routes
app.use(loggerMiddleware);
app.use("/api/v1", authRoutes); // /api/v1/register, /api/v1/login
app.use("/api/quiz", quizRoutes);
app.use("/api/v1", adminRouter);
app.use("/api/v1/tests", testsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/", analyzeRouter);

app.get("/", (req, res) =>
  res.json({ message: "🧠 English Test Generator Backend is running" })
);

// Error Handling
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port: ${PORT}`));
