import mongoose from "mongoose";
const ALLOWED_ROLES = ["user", "teacher", "admin"]; //TODO: teacher?

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    surname: {
      type: String,
      required: [true, "Surname is required"],
      trim: true,
      minlength: [2, "Surname must be at least 2 characters long"],
      maxlength: [50, "Surname cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
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
      default: undefined, // Keeps DB clean
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },

  //TODO: toJSON?
  { 
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // These fields are internal/secure and should never go to the frontend
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v; // Mongoose version key
        return ret;
      } 
    }
  }
);

export default mongoose.model("User", userSchema);
