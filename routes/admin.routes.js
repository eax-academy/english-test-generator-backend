import express from 'express';
import adminLog from '../routes/admin.logs.js';
import adminWords from '../routes/admin.words.js';

import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

import { getAllTests } from '../controllers/admin.controller.js';

const router = express.Router();

router.use('/logs', adminLog);
router.use('/words', adminWords);

// GET /api/v1/admin/tests - Views all tests in system (Admins only)
router.get('/admin/tests', verifyToken, isAdmin, getAllTests);

export default router;
