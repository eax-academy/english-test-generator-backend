import express from 'express';
import adminLog from '../routes/admin.logs.js';
import adminWords from '../routes/admin.words.js';

import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

import { getDashboardStats, getAllTests, getAllResults, saveResult } from '../controllers/admin.controller.js';
import { getAllUsers, deleteUserById, updateUserById } from '../controllers/user.controller.js';
import { getAllQuizzes, deleteQuiz } from '../controllers/quiz.controller.js';

const router = express.Router();

router.use('/logs', adminLog);
router.use('/words', adminWords);

// Dashboard
router.get('/dashboard', verifyToken, isAdmin, getDashboardStats);

// Users
// router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users', getAllUsers);
router.delete('/users/:id', verifyToken, isAdmin, deleteUserById);
router.put('/users/:id', verifyToken, isAdmin, updateUserById);

// Quizzes
router.get('/quizzes', verifyToken, isAdmin, getAllQuizzes);
router.delete('/quizzes/:id', verifyToken, isAdmin, deleteQuiz);

// Results (Tests & Attempts)
router.get('/tests', verifyToken, isAdmin, getAllTests);
// router.get('/results', verifyToken, isAdmin, getAllResults);
// router.post('/results', verifyToken, saveResult);
router.get('/results', getAllResults);
router.post('/results', saveResult);

export default router;
