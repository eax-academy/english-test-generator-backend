import express from "express";
import { getAllQuizzes, deleteQuiz } from "../controllers/quiz.controller.js";

const router = express.Router();

// Quizzes
router.get("/", getAllQuizzes);
router.delete("/:id", deleteQuiz);

export default router;
