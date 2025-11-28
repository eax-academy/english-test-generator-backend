import express from 'express';
import Test from '../models/test.model.js';
import TextSubmission from '../models/textSubmission.model.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/v1/tests/generate/:submission_id - Generate test questions from text
router.post('/generate/:submission_id', verifyToken, async (req, res) => {
    try {
        const { submission_id } = req.params;
        const submission = await TextSubmission.findById(submission_id);

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Placeholder logic: Create a dummy test linked to the submission
        // In a real app, this would use AI or NLP to generate questions from submission.raw_text
        const newTest = new Test({
            submission_id: submission._id,
            question: `What is the main idea of the text? (Generated from submission ${submission_id})`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: 'Option A'
        });

        await newTest.save();
        res.status(201).json(newTest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/tests - List all generated tests (Logged-in users)
// Note: This should probably filter by user's submissions, but Test model only links to Submission.
// We need to look up submissions by user, then find tests for those submissions.
router.get('/', verifyToken, async (req, res) => {
    try {
        // Find submissions by this user
        const userSubmissions = await TextSubmission.find({ user_id: req.user.id }).select('_id');
        const submissionIds = userSubmissions.map(s => s._id);

        // Find tests linked to those submissions
        const tests = await Test.find({ submission_id: { $in: submissionIds } }).sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/tests/:id - Show details of a specific test
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Optional: Check ownership via submission
        // const submission = await TextSubmission.findById(test.submission_id);
        // if (submission.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
        //   return res.status(403).json({ message: 'Access Denied' });
        // }

        res.json(test);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/v1/tests/:id - Delete one of your tests
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Check ownership
        const submission = await TextSubmission.findById(test.submission_id);
        if (submission && submission.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied' });
        }

        await Test.findByIdAndDelete(req.params.id);
        res.json({ message: 'Test deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/v1/tests/:id - Modifies test content (Admins only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const updatedTest = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTest) return res.status(404).json({ message: 'Test not found' });
        res.json(updatedTest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

export default router;
