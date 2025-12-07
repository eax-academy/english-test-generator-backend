import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Password hashing
 * @param {string} password - Original password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Comparing password with hash
 * @param {string} password - Original password
 * @param {string} hash - Hash from DB
 * @returns {Promise<boolean>} - Result of checking
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}