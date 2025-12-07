import express from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/auth.controllers.js';

import { registrationLimiter, authLimiter } from '../middleware/ratelimiter.middleware.js';

const router = express.Router();
router.post('/register', registrationLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;


