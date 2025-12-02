// controllers/user.controller.js
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';


export const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const { name, surname, email, password } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (surname) updates.surname = surname;
        if (email) updates.email = email;
        if (password) updates.password = await bcrypt.hash(password, 10);

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteMyProfile = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Admin Management ---

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateUserById = async (req, res) => {
    try {
        const { name, surname, email, role, password } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (surname) updates.surname = surname;
        if (email) updates.email = email;
        if (role) updates.role = role;
        if (password) updates.password = await bcrypt.hash(password, 10);

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteUserById = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};