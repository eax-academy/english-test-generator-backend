import mongoose from 'mongoose';

export const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['fill', 'translation', 'definition', 'mixed'],
    required: true
  },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  options: [String],
  wordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word',
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Question', questionSchema);
