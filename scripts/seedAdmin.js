import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";

export const seedAdmins = async () => {
  try {
    const adminEmailsStr = process.env.ADMIN_EMAILS;
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminEmailsStr || !initialPassword) {
      console.log(
        "⚠️ Seeding skipped: ADMIN_EMAILS or PASSWORD not set in .env",
      );
      return;
    }

    const emails = adminEmailsStr.split(",").map((e) => e.trim().toLowerCase());

    for (const email of emails) {
      const exists = await User.findOne({ email });

      if (!exists) {
        const hashedPassword = await bcrypt.hash(initialPassword, 12);
        await User.create({
          name: "System",
          surname: "Admin",
          email: email,
          password: hashedPassword,
          role: "admin",
        });
        console.log(`✅ Admin created automatically: ${email}`);
      }
    }
  } catch (error) {
    console.error("❌ Automatic Seeding Error:", error.message);
  }
};
