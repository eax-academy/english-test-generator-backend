import express from 'express';
import {
    getAllSubmissions,
    getSubmissionById,
    deleteSubmission,
    updateSubmission
} from '../controllers/admin.submission.controller.js';

const router = express.Router();

router.get('/', getAllSubmissions);
router.get('/:id', getSubmissionById);
router.put('/:id', updateSubmission);
router.delete('/:id', deleteSubmission);

export default router;