import express from 'express';
import { createQuizController } from '../controllers/quiz.controller.js';
import {
  getAllQuizzes,
  getQuizById,
  deleteQuiz
} from '../services/quiz.service.js';

const router = express.Router();

router.post('/', createQuizController);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);

export default router;


