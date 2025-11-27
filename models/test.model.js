import mongoose from 'mongoose';

const testSchema = new mongoose.Schema(
    {
        submission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TextSubmission' },
        linked_word_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Word' },
        question: { type: String, required: true },
        options: [{ type: String }],
        correct_answer: { type: String, required: true }
    },
    { timestamps: true }
);

export default mongoose.model('Test', testSchema);
