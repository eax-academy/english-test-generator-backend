import express from "express";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

import adminLog from "../routes/admin.logs.js";
import adminWords from "./admin.words.routes.js";
import adminSubmissions from "./admin.submissions.routes.js";

import {
  getDashboardStats,
  getAllTests,
  getAllResults,
} from "../controllers/admin.controller.js";
import {
  getAllUsers,
  deleteUserById,
  updateUserById,
} from "../controllers/user.controller.js";
import { getAllQuizzes, deleteQuiz } from "../controllers/quiz.controller.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.use("/logs", adminLog);
router.use("/words", adminWords);
router.use("/submissions", adminSubmissions);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Users
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUserById);
router.put("/users/:id", updateUserById);

// Quizzes
router.get("/quizzes", getAllQuizzes);
router.delete("/quizzes/:id", deleteQuiz);

// Results (Tests & Attempts)
router.get("/results", getAllResults);
router.get("/tests", getAllTests);

export default router;
