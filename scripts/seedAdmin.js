import mongoose from "mongoose";
import * as crypto from "../utils/crypto.js"; // Using your hashing utility
import { config } from "../config/env.js";
import User from "../models/user.model.js";

const seedAdmins = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("📡 Admin seeding started...");

    const emails = process.env.ADMIN_EMAILS.split(",").map((e) =>
      e.trim().toLowerCase(),
    );

    const password = process.env.INITIAL_ADMIN_PASSWORD;

    for (const email of emails) {
      const exists = await User.findOne({ email });

      if (!exists) {
        const hashedPassword = await crypto.hashPassword(password);

        await User.create({
          name: "System",
          surname: "Admin",
          email: email,
          password: hashedPassword,
          role: "admin",
        });

        console.log(`✅ Admin created: ${email}`);
      } else {
        if (exists.role !== "admin") {
          exists.role = "admin";
          await exists.save();
          console.log(`🆙 Role updated to admin: ${email}`);
        } else {
          console.log(`ℹ️ Admin already exists: ${email}`);
        }
      }
    }

    await mongoose.disconnect();
    console.log("🏁 Seeding completed successfully.");
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
    process.exit(1);
  }
};

seedAdmins();
