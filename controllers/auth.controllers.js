import * as AuthService from '../services/auth.service.js';

export const register = async (req, res) => {
    try {
        await AuthService.registerUser(req.body);
        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        // Simple error handling for example. 
        // In real apps, check err.message to set 400 vs 500 status
        const status = err.message === "User already exists" ? 400 : 500;
        res.status(status).json({ message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const result = await AuthService.loginUser(req.body);
        res.json({ message: "Login successful", token: result.token });
    } catch (err) {
        const status = (err.message === "User not found" || err.message === "Invalid credentials") ? 401 : 500;
        res.status(status).json({ message: err.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        await AuthService.requestPasswordReset(req.body.email);
        res.json({ message: "Password reset email sent!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        await AuthService.resetUserPassword(req.body.token, req.body.newPassword);
        res.json({ message: "Password has been reset successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};