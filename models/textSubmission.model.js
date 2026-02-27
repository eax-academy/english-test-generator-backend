import mongoose from "mongoose";

const MAX_TEXT_LENGTH = 10000; // Adjusted for 1000+ words (assuming avg 5 chars/word + spaces)
const MAX_KEYWORD_COUNT = 20;


const NormalizedWordSchema = new mongoose.Schema({
  word: { type: String, required: true },       // Original text (e.g. "Running")
  lemma: { type: String, required: true },      // Root form (e.g. "run")
  word_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Word' }, 
  count: { type: Number, default: 1 },          // LOCAL usage count (in this text)
  significanceScore: { type: Number, default: 0 },
  isSignificant: { type: Boolean, default: false }
}, { _id: false });

const textSubmissionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    raw_text: {
      type: String,
      required: [true, "Text content is required"],
      trim: true,
      minlength: [10, "Text must be at least 10 characters long"],
      maxlength: [MAX_TEXT_LENGTH, `Text cannot exceed ${MAX_TEXT_LENGTH} chars`],
    },
    normalized_words: [NormalizedWordSchema], 
    

    top_keywords: {
      type: [String],
      default: [],
      validate: [val => val.length <= MAX_KEYWORD_COUNT, "{PATH} exceeds the limit of " + MAX_KEYWORD_COUNT],
    },
  },
  { timestamps: true }
);

const TextSubmission =
  mongoose.models.TextSubmission ||
  mongoose.model("TextSubmission", textSubmissionSchema);
export default TextSubmission;
