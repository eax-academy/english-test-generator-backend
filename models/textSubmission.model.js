import mongoose from 'mongoose';

const textSubmissionSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        raw_text: { type: String, required: true },
        normalized_words: [{ type: String }]
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('TextSubmission', textSubmissionSchema);
