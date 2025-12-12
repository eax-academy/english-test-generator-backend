import mongoose from "mongoose";
import { config } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    // console.log(`PORT : ${config.port}`);
    console.log(`✅ MongoDB connected: ${conn.connection.host}:27017/${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("👋 MongoDB disconnected gracefully");
  } catch (error) {
    console.error(`❌ MongoDB Disconnect Error: ${error.message}`);
  }
};
