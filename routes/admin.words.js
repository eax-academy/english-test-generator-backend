import express from 'express';
import Word from '../models/word.model.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/v1/words - List all words
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const words = await Word.find().sort({ createdAt: -1 });
        res.json(words);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});




// POST /api/v1/words - Add new word
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { word, translation, language, lemma, pos } = req.body;
        const newWord = new Word({ word, translation, language, lemma, pos });
        await newWord.save();
        res.status(201).json(newWord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/words/:id - Update word
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const updatedWord = await Word.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedWord) return res.status(404).json({ message: 'Word not found' });
        res.json(updatedWord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/words/:id - Delete word
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const deletedWord = await Word.findByIdAndDelete(req.params.id);
        if (!deletedWord) return res.status(404).json({ message: 'Word not found' });
        res.json({ message: 'Word deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
