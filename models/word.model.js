import mongoose from "mongoose";

const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "idiom",
  "other",
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2","UNKNOWN"];

const WordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      minlength: [1, "Word must be at least 1 character long"],
      maxlength: [50, "Word cannot exceed 50 characters"],
      match: [/^[a-zA-Z\s-]+$/, "Word contains invalid characters"],
    },
    lemma: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    definition: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, "Definition cannot exceed 1000 characters"],
    },
    translation: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, "Translation cannot exceed 500 characters"],
    },
    partOfSpeech: {
      type: String,
      enum: {
        values: PARTS_OF_SPEECH,
        message: "{VALUE} is not a valid part of speech",
      },
      required: false,
      lowercase: true,
    },

    level: {
      type: String,
      enum: CEFR_LEVELS,
      default: "UNKNOWN",
      uppercase: true,
      index: true
    },
    usage_count: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Usage count must be an integer",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model("Word", WordSchema);
