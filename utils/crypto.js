import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto"; // Built-in Node module
import { config } from "../config/env.js";

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, config.saltRounds);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

//TOKEN SIGNING
export const signAccessToken = (payload) => {
  return jwt.sign(payload, config.accessSecret, { expiresIn: "15m" });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.refreshSecret, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.refreshSecret);
  } catch (error) {
    return null;
  }
};


// TOKEN HASHING 
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const compareToken = (token, storedHash) => {
  const computedHash = hashToken(token);
  const a = Buffer.from(computedHash);
  const b = Buffer.from(storedHash);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};
