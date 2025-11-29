import mongoose from "mongoose";

const WordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,     // The word must exist
      unique: true,       // No duplicate words allowed
      index: true,        // Makes searching for words very fast
      trim: true,         // Removes spaces from start/end automatically
    },
    definition: {
      type: String,
      required: false,
    },
    translation: {
      type: String,
      required: false,
    },
    partOfSpeech: {
      type: String,
      required: false,
      // Examples: "noun", "verb", "adjective"
    },
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2", "Unknown"],
      default: "Unknown",
    },
    usage_count: {
      type: Number,
      default: 0,         // Starts at 0 if not provided
    },
  },
  {
    timestamps: true,     // Automatically adds 'createdAt' and 'updatedAt'
  }
);

// Check if the model is already defined (prevents errors in some environments)
// Otherwise, define it.
export const WordModel = mongoose.models.Word || mongoose.model("Word", WordSchema);

