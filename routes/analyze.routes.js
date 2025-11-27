import express from 'express';
import{
  processTextAnalysis
}
from '../services/word.service.js';
const router = express.Router();

router.post('/analyze', async (req, res) => {
  console.log("Route called with body:", req.body);
  try {
    const { text } = req.body;
    const analyzedData = await processTextAnalysis(text); 
    
    res.json(analyzedData); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


