import express from 'express';
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz
} from '../services/quiz.service.js';

const router = express.Router();

router.post('/', createQuiz);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);

export default router;
