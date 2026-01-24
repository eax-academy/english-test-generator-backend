import Word from '../models/word.model.js';

export const getAllWords = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const words = await Word.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

      const total = await Word.countDocuments();

      res.json({
          words,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalWords: total
      });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const getWordById = async (req, res) => {
  try {
      const word = await Word.findById(req.params.id);
      if (!word) {
          return res.status(404).json({ message: 'Word not found' });
      }
      res.json(word);
  } catch (err) {
      if (err.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Word ID format' });
      }
      res.status(500).json({ message: err.message });
  }
};

export const createWord = async (req, res) => {
  try {
      const { word, translation, language, lemma, pos, level } = req.body; // Only take what you need
      const newWord = new Word({ word, translation, language, lemma, pos, level });
      await newWord.save();
      res.status(201).json(newWord);
  } catch (err) {
      res.status(400).json({ message: err.message });
  }
};

export const updateWord = async (req, res) => {
    try {
        const updatedWord = await Word.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedWord) return res.status(404).json({ message: 'Word not found' });
        res.json(updatedWord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteWord = async (req, res) => {
    try {
        const deletedWord = await Word.findByIdAndDelete(req.params.id);
        if (!deletedWord) return res.status(404).json({ message: 'Word not found' });
        res.json({ message: 'Word deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};