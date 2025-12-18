import * as wordService from "../services/word.service.js";

// READ ALL
export const getWords = async (req, res) => {
  try {
    const { page, limit, search, level, partOfSpeech } = req.query;

    const result = await wordService.getAllWordsService(
      { search, level, partOfSpeech }, // filters
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: result.words,
      pagination: {
        totalWords: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// READ ONE
export const getWordById = async (req, res) => {
  try {
    const word = await wordService.getWordByIdService(req.params.id);
    
    if (!word) {
      return res.status(404).json({ success: false, message: "Word not found" });
    }

    return res.status(200).json({ success: true, data: word });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE
export const updateWord = async (req, res) => {
  try {
    const updatedWord = await wordService.updateWordService(req.params.id, req.body);

    if (!updatedWord) {
      return res.status(404).json({ success: false, message: "Word not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Word updated",
      data: updatedWord,
    });
  } catch (error) {
    // Basic error handling for duplicates or validation
    const status = error.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};

// DELETE
export const deleteWord = async (req, res) => {
  try {
    const deleted = await wordService.deleteWordService(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Word not found" });
    }

    return res.status(200).json({ success: true, message: "Word deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};