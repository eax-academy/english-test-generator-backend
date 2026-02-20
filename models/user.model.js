import mongoose from "mongoose";
const ALLOWED_ROLES = ["user", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
      match: [/^[a-zA-Z-]+$/, "Name can only contain letters and hyphens"],
    },
    surname: {
      type: String,
      required: [true, "Surname is required"],
      trim: true,
      minlength: [2, "Surname must be at least 2 characters long"],
      maxlength: [50, "Surname cannot exceed 50 characters"],
      match: [/^[a-zA-Z-]+$/, "Surname can only contain letters and hyphens"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ALLOWED_ROLES,
        message: "{VALUE} is not a valid role",
      },
      default: "user",
      trim: true,

    },
    // --- AUTH SYSTEM REQUIREMENT ---
    resetPasswordToken: {
      type: String,
      default: undefined,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
      select: false
    },
    passwordResetCooldown: {
      type: Date,
      default: undefined,
      select: false
    },
  },

  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export default mongoose.model("User", userSchema);
