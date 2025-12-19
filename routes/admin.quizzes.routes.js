import express from "express";
import {
  getAllQuizzes,
  deleteQuiz,
  getQuizById,
} from "../controllers/quiz.controller.js";

const router = express.Router();

// Quizzes
router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);

export default router;
