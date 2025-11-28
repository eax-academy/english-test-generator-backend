import express from 'express';
import adminLog from '../routes/admin.logs.js';
import adminWords from '../routes/admin.words.js';

import Test from '../models/test.model.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use('/logs', adminLog);
router.use('/words', adminWords);

// GET /api/v1/admin/tests - Views all tests in system (Admins only)
router.get('/admin/tests', verifyToken, isAdmin, async (req, res) => {
    try {
        const tests = await Test.find().sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
