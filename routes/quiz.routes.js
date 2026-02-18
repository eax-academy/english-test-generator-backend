import express from 'express';
import {
  createQuizController,
  getAllQuizzes,
  getQuizById,
  deleteQuiz
} from '../controllers/quiz.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
//TODO: ADD UPDATE QUIZ
const router = express.Router();

router.use(verifyToken);

router.post('/', createQuizController);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id',  deleteQuiz);

export default router;
