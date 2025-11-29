import mongoose from "mongoose";

const WordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true, // Auto-removes whitespace
    },
    translation: {
      type: String,
      required: false,
    },
    usage_count: {
      type: Number,
      required: false,
      default: 0,
    },
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2", "Unknown"],
      default: "Unknown",
    },
    definition: {
      type: String,
      required: false,
    },
    partOfSpeech: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // Creates createdAt and updatedAt
  }
);

export const WordModel = mongoose.model("Word", WordSchema);