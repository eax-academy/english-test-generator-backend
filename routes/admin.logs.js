import express from 'express';
import Log from '../models/log.model.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const adminLog = express.Router();

// GET /api/v1/logs - View system activity records (Admins only)
adminLog.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const logs = await Log.find()
            .sort({ timestamp: -1 })
            .limit(100)
            .populate('userId', 'email'); // Optional: populate user email if needed
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default adminLog;
