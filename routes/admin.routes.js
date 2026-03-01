import express from "express";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

import adminLog from "./admin.logs.js";
import adminWords from "./admin.words.routes.js";
import adminSubmissions from "./admin.submissions.routes.js";
import adminQuizzes from "./admin.quizzes.routes.js";
import adminUsersSubRouter from "./admin.users.routes.js";

import {
  getDashboardStats,
  getAllTests,
  getAllResults,
  saveResult,
  getAllUsers,
  deleteUser,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(verifyToken);

router.use("/logs", isAdmin, adminLog);
router.use("/words", isAdmin, adminWords);
router.use("/submissions", isAdmin, adminSubmissions);
router.use("/quizzes", isAdmin, adminQuizzes);
router.use("/users-list", isAdmin, adminUsersSubRouter);

router.get("/dashboard", isAdmin, getDashboardStats);

router.get("/users", isAdmin, getAllUsers);
router.delete("/users/:id", isAdmin, deleteUser);

router.get("/results", isAdmin, getAllResults);
router.get("/tests", isAdmin, getAllTests);

router.post("/results", saveResult);

export default router;
