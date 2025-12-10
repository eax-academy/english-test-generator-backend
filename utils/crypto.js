import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto'; // Built-in Node module
import { config } from '../config/env.js';

// --- CONFIGURATION ---
const SALT_ROUNDS = 12; 
// ==========================================================
// 1. PASSWORD LOGIC 
// ==========================================================

/**
 * Hash a plain password.
 * SLOW operation (CPU intensive) to prevent brute force.
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain password with a hash.
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// ==========================================================
// 2. TOKEN SIGNING (Use JSON Web Token)
// ==========================================================

export const signAccessToken = (payload) => {
  return jwt.sign(payload, config.accessSecret, { expiresIn: '15m' });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.refreshSecret, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.refreshSecret);
  } catch (error) {
    return null; // Return null if invalid/expired
  }
};

// ==========================================================
// 3. TOKEN HASHING (Use SHA-256)
// ==========================================================
// CRITICAL: We need to store Refresh Tokens in the DB to allow revocation.
// BUT: We cannot store them plain text (if DB leaks, users are hacked).


/**
 * Fast hash for storing tokens in DB.
 * Output: Hex string.
 */
export const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Securely compare a token against a stored hash.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export const compareToken = (token, storedHash) => {
  const computedHash = hashToken(token);
  
  // Convert strings to Buffers for timing-safe comparison
  const a = Buffer.from(computedHash);
  const b = Buffer.from(storedHash);

  // If lengths don't match, they aren't equal (prevent error in timingSafeEqual)
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};