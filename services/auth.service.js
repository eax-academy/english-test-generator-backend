import User from "../models/user.model.js";
import * as authUtils from "../utils/crypto.js";
import redisClient from "../config/redis.js";
import crypto from "node:crypto";

export async function registerUser({ name, surname, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashedPassword = await authUtils.hashPassword(password);
  return await User.create({
    name,
    surname,
    email,
    password: hashedPassword,
  });
}

/**
 * Login user and issue Access + Refresh Tokens
 */
export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );
  if (!user) throw new Error("User not found");

  const valid = await authUtils.comparePassword(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  return generateTokensAndSave(user);
}

export const refreshUserToken = async (incomingToken) => {
  if (!incomingToken) throw new Error("No token provided");

  const decoded = authUtils.verifyRefreshToken(incomingToken);
  if (!decoded) throw new Error("Invalid token");

  const redisKey = `refresh_token:${decoded.sub}`;
  const storedHash = await redisClient.get(redisKey);
  if (!storedHash) throw new Error("Access denied");

  const isMatch = authUtils.compareToken(incomingToken, storedHash);

  if (!isMatch) {
    console.error(`Reuse Detected for user ${decoded.sub}`);
    await redisClient.del(redisKey);
    throw new Error("Reuse detected");
  }
  const user = await User.findById(decoded.sub);
  if (!user) throw new Error("User not found");
  return generateTokensAndSave(user);
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select(
    "+password +passwordResetCooldown",
  );
  if (!user) throw new Error("User not found");

  const isMatch = await authUtils.comparePassword(
    currentPassword,
    user.password,
  );
  if (!isMatch) throw new Error("Current password is incorrect");

  if (user.passwordResetCooldown && user.passwordResetCooldown > Date.now()) {
    const waitMs = user.passwordResetCooldown - Date.now();
    const waitMin = Math.ceil(waitMs / 60000);
    throw new Error(`Please wait ${waitMin} minute(s) before changing again.`);
  }

  user.password = await authUtils.hashPassword(newPassword);
  user.passwordResetCooldown = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  return true;
};

export const logoutUser = async (userId) => {
  await redisClient.del(`refresh_token:${userId}`);
};

const generateTokensAndSave = async (user) => {
  const payload = { sub: user._id, role: user.role };

  const accessToken = authUtils.signAccessToken(payload);
  const refreshToken = authUtils.signRefreshToken({ sub: user._id });
  const hashedToken = authUtils.hashToken(refreshToken);

  const REDIS_TTL = 7 * 24 * 60 * 60;
  await redisClient.set(`refresh_token:${user._id}`, hashedToken, {
    EX: REDIS_TTL,
  });

  return { accessToken, refreshToken, user };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;

  await user.save();

  console.log("-----------------------------------------");
  console.log(`RESET TOKEN FOR ${email}: ${resetToken}`);
  console.log("-----------------------------------------");

  return { resetToken, user };
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error("Token is invalid or has expired");

  user.password = await authUtils.hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};
