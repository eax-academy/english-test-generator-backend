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

const ResetPassSchema = z.object({
  password: z.string().min(6),
});

const ForgotPassSchema = z.object({
  email: z.string().email(),
});

// --- CONTROLLER FUNCTIONS ---

export const register = async (req, res) => {
  try {
    // 1. Validate Input
    const data = RegisterSchema.parse(req.body);
    
    // 2. Call Service
    await authService.registerUser(data);
    
    // 3. Send Response (We don't auto-login here, forcing them to login confirms flow)
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    
    // Service returns tokens and user
    const { accessToken, refreshToken, user } = await authService.loginUser({ email, password });
    
    // SET COOKIES
    // Access Token: 15 minutes
    res.cookie('accessToken', accessToken, { 
      ...COOKIE_OPTIONS, 
      maxAge: 15 * 60 * 1000 
    });

    // Refresh Token: 7 days
    res.cookie('refreshToken', refreshToken, { 
      ...COOKIE_OPTIONS, 
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.json({ message: 'Login successful', user });
  } catch (error) {
    handleError(res, error);
  }
};

export const refresh = async (req, res) => {
  try {
    // Get refresh token from Cookie
    const token = req.cookies.refreshToken;
    
    // Service rotates tokens
    const { accessToken, refreshToken } = await authService.refreshUserToken(token);

    // Send NEW Cookies
    res.cookie('accessToken', accessToken, { 
      ...COOKIE_OPTIONS, 
      maxAge: 15 * 60 * 1000 
    });
    
    res.cookie('refreshToken', refreshToken, { 
      ...COOKIE_OPTIONS, 
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.json({ message: 'Tokens refreshed' });
  } catch (error) {
    // If refresh fails, clear everything so frontend knows to redirect to login
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(403).json({ error: 'Session expired, please login again' });
  }
};

export const logout = async (req, res) => {
  try {
    const userId = req.user?.sub; // "sub" comes from the middleware
    if (userId) {
      await authService.logoutUser(userId);
    }
    
    // Always clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = ForgotPassSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    // Security: Always say "If email exists..." to prevent user enumeration
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    handleError(res, error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = ResetPassSchema.parse(req.body);
    
    await authService.resetUserPassword(token, password);
    res.json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    handleError(res, error);
  }
};

// --- HELPER ---
const handleError = (res, error) => {
  // Zod Validation Error
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  // Service Errors
  if (error.message === 'User already exists') return res.status(409).json({ error: error.message });
  if (error.message === 'Invalid credentials') return res.status(401).json({ error: error.message });
  if (error.message === 'Access denied' || error.message === 'Reuse detected') return res.status(403).json({ error: 'Forbidden' });
  
  // Default
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
};