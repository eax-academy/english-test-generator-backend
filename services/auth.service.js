import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { hashPassword, comparePassword } from "../utils/password.utils.js";

export async function register(req, res) {
  try {
    const { name, surname, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await hashPassword(password);
    const user = new User({ name, surname, email, password: hashed });
    await user.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
