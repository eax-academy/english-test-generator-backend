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
    password: { type: String, required: true },
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
    // Stores the HASH of the refresh token. 
    // If the DB is hacked, they can't create access tokens.
    refreshTokenHash: {
      type: String,
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: undefined, 
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },

  { 
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // These fields are internal/secure and should never go to the frontend
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v; 
        return ret;
      } 
    }
  }
);

export default mongoose.model("User", userSchema);
