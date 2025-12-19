import Word from "../models/word.model.js";

export const getAllWordsService = async (filters, page = 1, limit = 20) => {
  const query = {};

  if (filters.search) {
    query.$or = [
      { word: { $regex: filters.search, $options: "i" } },
      { lemma: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters.level) query.level = filters.level.toUpperCase();
  if (filters.partOfSpeech)
    query.partOfSpeech = filters.partOfSpeech.toLowerCase();

  const words = await Word.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ usage_count: -1, word: 1 });

  const total = await Word.countDocuments(query);

  return {
    words,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  };
};

export const getWordByIdService = async (id) => {
  return await Word.findById(id);
};

export const updateWordService = async (id, updateData) => {
  return await Word.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const deleteWordService = async (id) => {
  return await Word.findByIdAndDelete(id);
};
