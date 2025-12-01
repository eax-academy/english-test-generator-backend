import express from 'express';
import { analyzeTextController } from '../controllers/analyze.controller.js';

const router = express.Router();

router.post('/analyze', analyzeTextController);

export default router;
