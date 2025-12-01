import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log("DB connected"))
      .catch(err => console.error(err));
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};
