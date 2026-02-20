import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

import adminLog from "../routes/admin.logs.js";
import adminWords from "./admin.words.routes.js";
import adminSubmissions from "./admin.submissions.routes.js";
import adminQuizzes from "./admin.quizzes.routes.js";
import adminUsers from "./admin.users.routes.js";

import {
  getDashboardStats,
  getAllTests,
  getAllResults,
  saveResult,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(verifyToken);

router.use("/logs", isAdmin, adminLog);
router.use("/words", isAdmin, adminWords);
router.use("/submissions", isAdmin, adminSubmissions);
router.use("/quizzes", isAdmin, adminQuizzes);
router.use("/users", isAdmin, adminUsers);

// Dashboard
router.get("/dashboard", isAdmin, getDashboardStats);

// Results (Tests & Attempts)
router.get("/results", isAdmin, getAllResults);
router.post("/results", saveResult)
router.get("/tests", isAdmin, getAllTests);

export default router;
