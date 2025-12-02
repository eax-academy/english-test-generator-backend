import mongoose from 'mongoose';
const ALLOWED_ROLES = ["user", "teacher", "admin"]; //TODO: teacher?

const userSchema = new mongoose.Schema(
  {
    name: { type: String, 
      required:  [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],

    },
    surname: { type: String, 
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
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
      index: true
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
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
