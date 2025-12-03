import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import { sendEmail } from "../utils/email.js";
import JwtClaims from "../utils/JwtClaims.js";

export async function registerUser({ name, surname, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashed = await hashPassword(password);
  const user = new User({ name, surname, email, password: hashed });
  await user.save();
  return user;
}


export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  // Calculate expiration (e.g., 7 days from now)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const expDate = new Date(Date.now() + sevenDays);

  //Create the Claims Instance
  const claims = new JwtClaims(
    user._id.toString(), 
    user.role || "user", 
    expDate
  );

  //Generate the token
  const token = jwt.sign(
    claims.toPayload(),
    process.env.JWT_SECRET
  );

  return { token, user };
}


export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  //environment variable
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5002";
  const resetLink = `${clientUrl}/reset-password/${token}`;

  // Return the promise of sending email
  await sendEmail(
    user.email,
    "Password Reset Request",
    `<h1>Reset Your Password</h1><p>Click here: <a href="${resetLink}">${resetLink}</a></p>`
  );
  return true;
};


export const resetUserPassword = async (token, newPassword) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) throw new Error("Invalid or expired token");

  user.password = await hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  return true;
};