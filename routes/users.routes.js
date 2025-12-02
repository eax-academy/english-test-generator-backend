// routes/user.routes.js
import express from 'express';
import {
    getMyProfile,
    updateMyProfile,
    deleteMyProfile,
    getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById
} from '../controllers/user.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- Profile Management ---
router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateMyProfile);
router.delete('/me', verifyToken, deleteMyProfile);

// --- Admin Management ---
router.get('/', verifyToken, isAdmin, getAllUsers);
router.get('/:id', verifyToken, isAdmin, getUserById);
router.put('/:id', verifyToken, isAdmin, updateUserById);
router.delete('/:id', verifyToken, isAdmin, deleteUserById);

export default router;