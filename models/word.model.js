import mongoose from "mongoose";

const WordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
    },
    usage_count: { 
      type: Number, 
      default: 0 }, //global frequency
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2", "Unknown"],
      default: "Unknown",
    },
    usage_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Word", WordSchema);
