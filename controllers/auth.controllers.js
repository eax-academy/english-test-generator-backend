import * as authService from '../services/auth.service.js';
import { z } from 'zod';
import { config } from '../config/env.js'; // Assuming you have your env config here
import jwt from 'jsonwebtoken';

// --- CONFIGURATION ---
// Cookie settings for security
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevent XSS (JS cannot read these)
  secure: config.env === 'production', // HTTPS only in production
  sameSite: 'lax', // CSRF protection
  path: '/', // Available everywhere
};

// --- VALIDATION SCHEMAS (ZOD) ---
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  surname: z.string().min(2, "Surname is required"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const ChangePassSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

// --- HELPERS ---
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};


// --- HELPER ---
const handleError = (res, error) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  if (error.message === 'User already exists') return res.status(409).json({ error: error.message });
  if (error.message === 'Invalid credentials') return res.status(401).json({ error: error.message });
  if (error.message === 'Current password is incorrect') return res.status(401).json({ error: error.message });
  if (error.message === 'User not found') return res.status(404).json({ error: error.message });
  if (error.message === 'Access denied' || error.message === 'Reuse detected') return res.status(403).json({ error: 'Forbidden' });
  if (error.message?.startsWith('Please wait')) return res.status(429).json({ error: error.message });

  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
};

// --- CONTROLLER FUNCTIONS ---

export const register = async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    await authService.registerUser(data);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.loginUser({ email, password });
    setTokenCookies(res, accessToken, refreshToken);
    // Strip sensitive fields before sending to client
    const { password: _pw, ...safeUser } = user.toObject ? user.toObject() : user;
    res.json({ message: 'Login successful', user: safeUser, token: accessToken });
  } catch (error) {
    handleError(res, error);
  }
};



export const adminLogin = async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.loginUser({ email, password });

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    setTokenCookies(res, accessToken, refreshToken);
    res.json({ message: 'Admin Login successful', user, token: accessToken });
  } catch (error) {
    handleError(res, error);
  }
};


export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const { accessToken, refreshToken, user } =
      await authService.refreshUserToken(token);

    setTokenCookies(res, accessToken, refreshToken);

    return res.json({ user });
  } catch (error) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(403).json({ error: "Session expired" });
  }
};


export const logout = async (req, res) => {
  try {
    let userId = req.user?.sub;

    // Try to get userId from refresh token if req.user is missing
    if (!userId && req.cookies.refreshToken) {
      const decoded = jwt.decode(req.cookies.refreshToken);
      if (decoded?.sub) userId = decoded.sub;
    }

    // Call logout service only if we have a userId
    if (userId) {
      await authService.logoutUser(userId);
    }

    // Clear cookies
    res.clearCookie("accessToken", { ...COOKIE_OPTIONS, path: "/" });
    res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, path: "/" });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};

// Requires verifyToken middleware — only the logged-in user can change THEIR OWN password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { currentPassword, newPassword } = ChangePassSchema.parse(req.body);
    await authService.changePassword(userId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    handleError(res, error);
  }
};