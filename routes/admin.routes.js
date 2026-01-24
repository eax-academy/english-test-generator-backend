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
} from "../controllers/admin.controller.js";

const router = express.Router();

//router.use(verifyToken, isAdmin);

router.use("/logs", adminLog);
router.use("/words", adminWords);
router.use("/submissions", adminSubmissions);
router.use("/quizzes", adminQuizzes);
router.use("/users", adminUsers);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Results (Tests & Attempts)
router.get("/results", getAllResults);
router.get("/tests", getAllTests);

export default router;
