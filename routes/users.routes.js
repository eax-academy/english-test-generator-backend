import express from 'express';
import User from '../models/user.model.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// --- Profile Management (Logged-in User) ---

// GET /api/v1/users/me - Get own profile
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/v1/users/me - Update own profile
router.put('/me', verifyToken, async (req, res) => {
    try {
        const { name, surname, email, password } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (surname) updates.surname = surname;
        if (email) updates.email = email;
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/v1/users/me - Delete own account
router.delete('/me', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- User Administration (Admin Only) ---

// GET /api/v1/users - List all users
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/users/:id - Get specific user
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/v1/users/:id - Update specific user
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { name, surname, email, role, password } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (surname) updates.surname = surname;
        if (email) updates.email = email;
        if (role) updates.role = role;
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/v1/users/:id - Delete specific user
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
