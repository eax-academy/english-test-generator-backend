import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['fill', 'translation', 'definition', 'mixed'], required: true },
  question: String,
  answer: String,
  options: [String]
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    difficulty: { type: String, enum: ['basic', 'intermediate', 'advanced'], default: 'basic' },
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export default mongoose.model('Quiz', quizSchema);
