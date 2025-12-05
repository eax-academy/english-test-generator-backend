import mongoose from "mongoose";

const MAX_TEXT_LENGTH = 2000; // Adjusted for ~300 words (approx 6 chars per word + buffer)
const MAX_KEYWORD_COUNT = 20;
const MAX_WORD_LENGTH = 50;
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
      maxlength: [
        MAX_TEXT_LENGTH,
        `Text cannot exceed ${MAX_TEXT_LENGTH} characters (approx 300 words)`,
      ],
    },
    normalized_words: [
      {
        type: [String],
        default: [],
        validate: {
          validator: function (array) {
            return array.every((w) => w.length <= MAX_WORD_LENGTH);
          },
          message: `A word exceeds ${MAX_WORD_LENGTH} characters`,
        },
      },
    ],
    top_keywords: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (val) {
            return val.length <= MAX_KEYWORD_COUNT;
          },
          message: `Cannot store more than ${MAX_KEYWORD_COUNT} keywords`,
        },
      ],
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const TextSubmission =
  mongoose.models.TextSubmission ||
  mongoose.model("TextSubmission", textSubmissionSchema);
export default TextSubmission;
