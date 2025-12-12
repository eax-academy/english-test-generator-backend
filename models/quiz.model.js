import mongoose from 'mongoose';
import { questionSchema } from './question.model.js';

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['basic', 'intermediate', 'advanced'], default: 'basic' },
    textSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TextSubmission', required: true },
    questions: [questionSchema], 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export default mongoose.model('Quiz', quizSchema);
