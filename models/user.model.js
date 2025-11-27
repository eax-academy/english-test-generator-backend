import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'teacher', 'admin'], default: 'user' },
    name: { type: String },
    surname: { type: String },
    username: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

userSchema.methods.is_admin = function () {
  return this.role === 'admin';
};

userSchema.methods.has_role = function (role) {
  return this.role === role;
};

export default mongoose.model('User', userSchema);
