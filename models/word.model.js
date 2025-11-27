import mongoose from 'mongoose';

const WordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true, index: true },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown'], default: 'Unknown' },
  definition: String,
  updatedAt: { type: Date, default: Date.now }
});

export const WordModel = mongoose.model('Word', WordSchema);