import * as authService from '../services/auth.service.js';
import { z } from 'zod';
import { config } from '../config/env.js'; // Assuming you have your env config here

// --- CONFIGURATION ---
// Cookie settings for security
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevent XSS (JS cannot read these)
  secure: config.env === 'production', // HTTPS only in production
  sameSite: 'strict', // CSRF protection
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

const ForgotPassSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
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
  if (error.message === 'Access denied' || error.message === 'Reuse detected') return res.status(403).json({ error: 'Forbidden' });

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
    res.json({ message: 'Login successful', user, token: accessToken });
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
    const { accessToken, refreshToken } = await authService.refreshUserToken(token);
    setTokenCookies(res, accessToken, refreshToken);
    res.json({ message: 'Tokens refreshed' });
  } catch (error) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(403).json({ error: 'Session expired, please login again' });
  }
};

export const logout = async (req, res) => {
  try {
    const userId = req.user?.sub; // "sub" comes from the middleware
    if (!userId && req.cookies.refreshToken) {
      const decoded = jwt.decode(req.cookies.refreshToken);
      userId = decoded?.sub;
    }
    if (userId) {
      await authService.logoutUser(userId);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, password } = ForgotPassSchema.parse(req.body);
    await authService.resetPasswordDirect(email, password);
    res.json({ message: 'Password reset successfully. Please login.' });
  } catch (error) {
    handleError(res, error);
  }
};