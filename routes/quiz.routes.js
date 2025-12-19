import express from 'express';
import {
  createQuizController,
  getAllQuizzes,
  getQuizById,
  deleteQuiz
} from '../controllers/quiz.controller.js';
//TODO: ADD UPDATE QUIZ
const router = express.Router();

// All routes are now prefixed by /v1/quizzes in the main server
router.post('/', createQuizController);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);

export default router;
