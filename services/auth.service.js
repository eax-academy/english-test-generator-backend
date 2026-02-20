import User from "../models/user.model.js";
import * as crypto from "../utils/crypto.js";
import redisClient from "../config/redis.js";

export async function registerUser({ name, surname, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashedPassword = await crypto.hashPassword(password);
  const user = await User.create({
    name,
    surname,
    email,
    password: hashedPassword,
  });
  return user;
}

/**
 * Login user and issue Access + Refresh Tokens
 */
export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+password");;
  if (!user) throw new Error("User not found");

  const valid = await crypto.comparePassword(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  return generateTokensAndSave(user);
}

/**
 * Handle Token Refresh (Rotation)
 */
export const refreshUserToken = async (incomingToken) => {
  if (!incomingToken) throw new Error("No token provided");

  const decoded = crypto.verifyRefreshToken(incomingToken);
  if (!decoded) throw new Error("Invalid token");

  //Fetch hashed token from REDIS
  const redisKey = `refresh_token:${decoded.sub}`;
  const storedHash = await redisClient.get(redisKey);
  if (!storedHash) throw new Error("Access denied");

  const isMatch = crypto.compareToken(incomingToken, storedHash);

  if (!isMatch) {
    console.error(`Reuse Detected for user ${decoded.sub}`);
    await redisClient.del(redisKey);
    throw new Error("Reuse detected");
  }
  const user = await User.findById(decoded.sub);;
  if (!user) throw new Error("User not found");
  return generateTokensAndSave(user);
};

/**
 * Reset password directly — no email token needed
 */
export const resetPasswordDirect = async (email, newPassword) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new Error("User not found");

  user.password = await crypto.hashPassword(newPassword);
  await user.save();
  return true;
};

export const logoutUser = async (userId) => {
  await redisClient.del(`refresh_token:${userId}`);
};


// INTERNAL HELPER 
const generateTokensAndSave = async (user) => {
  const payload = { sub: user._id, role: user.role };

  // Generate JWTs
  const accessToken = crypto.signAccessToken(payload);
  const refreshToken = crypto.signRefreshToken({ sub: user._id });
  const hashedToken = crypto.hashToken(refreshToken);
  const REDIS_TTL = 7 * 24 * 60 * 60;
  await redisClient.set(`refresh_token:${user._id}`, hashedToken, {
    EX: REDIS_TTL,
  });

  return { accessToken, refreshToken, user };
};
