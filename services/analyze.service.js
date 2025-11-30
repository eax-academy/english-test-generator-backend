/**
 * Word Service Module
 *
 * Responsibilities:
 * 1. NLP Analysis: Cleaning text, extracting, and counting significant words.
 * 2. Database Synchronization: Efficiently syncing words with the MongoDB dictionary using bulk operations.
 * 3. Data Aggregation: Calculating "Significance Scores" based on local frequency and difficulty level.
 * 4. Submission Handling: Saving user text history and top keywords for quick access.
 */
import nlp from "compromise";
import WordModel from "../models/word.model.js";
import TextSubmissionModel from "../models/textSubmission.model.js";

/**
 * Helper: Determines the ranking weight based on CEFR difficulty level.
 * Used to calculate the "Significance Score".
 *
 * Logic:
 * - Unknown/C2 words get the highest priority (5.0/4.0).
 * - A1/A2 words get the lowest priority (0.1/0.5) as they are likely known.
 *
 * @param {string} level - The CEFR level (e.g., "A1", "C2", "Unknown").
 * @returns {number} The weight multiplier for the ranking algorithm.
 */
function getLevelWeight(level) {
  const weights = {
    Unknown: 5.0,
    C2: 4.0,
    C1: 3.0,
    B2: 2.0,
    B1: 1.5,
    A2: 0.5,
    A1: 0.1, //?
  };
  return weights[level] || 1;
}

/**
 * Extracts significant keywords from text and calculates their local frequency.
 *
 * Process:
 * 1. Pre-cleaning: Fixes spacing errors (e.g., "word.word") and removes newlines.
 * 2. NLP Analysis: Uses 'compromise' to identify terms.
 * 3. Normalization: Converts words to root form ("running" -> "run").
 * 4. Filtering:
 *    - Keeps only Nouns, Verbs, and Adjectives.
 *    - Removes structural junk (Prepositions, Pronouns, etc.).
 *    - Applies strict Regex cleaning to remove non-letter characters.
 *
 * @param {string} text - The raw input text to analyze.
 * @returns {Array<{word: string, count: number}>} An array of objects sorted by local frequency (descending).
 */
export function extractKeywordsWithFrequency(text) {
  // for debug console.log("📥 Input text:", `"${text}"`);
  if (!text || typeof text !== "string" || text.trim().length === 0) return [];
  const cleanText = text
    .replace(/([a-zA-Z])\.([a-zA-Z])/g, "$1 $2")
    .replace(/[\n\t\r]/g, " ");

  const doc = nlp(cleanText);
  doc.compute("root"); // Normalize words to their root form

  const frequencyMap = {};

  const allData = doc.json();
  if (!allData || allData.length === 0) {
    console.error("❌ CRITICAL: Compromise returned empty JSON.");
    return [];
  }

  allData.forEach((sentence) => {
    sentence.terms.forEach((term) => {
      const tags = term.tags || [];
      let root = term.root || term.normal || term.text;
      // Filter Logic: Keep Nouns/Verbs/Adjectives
      if (root) {
        root = root.replace(/[^a-zA-Z-]/g, "").toLowerCase();
      }
      const isTarget =
        tags.includes("Noun") ||
        tags.includes("Verb") ||
        tags.includes("Adjective");
      // Filter Logic: Remove structural words
      const isJunk =
        tags.includes("Preposition") ||
        tags.includes("Pronoun") ||
        tags.includes("Conjunction") ||
        tags.includes("Determiner") ||
        tags.includes("Auxiliary");

      const isValidWord = root && root.length >= 2;

      if (isTarget && !isJunk && isValidWord) {
        frequencyMap[root] = (frequencyMap[root] || 0) + 1;
      }
    });
  });

  return Object.keys(frequencyMap)
    .map((word) => ({ word, count: frequencyMap[word] }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Synchronizes a list of words with the MongoDB dictionary.
 *
 * Optimization:
 * - Uses `bulkWrite` to perform all DB operations in a single request.
 * - Logic:
 *   1. If the word exists: Increments `usage_count` (Global Frequency).
 *   2. If the word is new: Creates it with default "Unknown" level and increments `usage_count`.
 *
 * @param {string[]} wordsList - Array of unique word strings (roots).
 * @returns {Promise<Array<Object>>} A promise resolving to an array of updated Mongoose word documents.
 */
export async function syncWordsWithDB(wordsList) {
  if (!wordsList || wordsList.length === 0) return [];

  const operations = wordsList.map((word) => ({
    updateOne: {
      filter: { word: word },
      update: {
        $setOnInsert: {
          word: word,
          level: "Unknown",
          definition: "",
          translation: "",
        },
        // ALWAYS increase the global counter (popularity in the language)
        $inc: { usage_count: 1 },
      },
      upsert: true,
    },
  }));
  if (operations.length > 0) {
    await WordModel.bulkWrite(operations);
  }
  return await WordModel.find({ word: { $in: wordsList } });
}

/**
 * Main Orchestrator Function.
 *
 * Workflow:
 * 1. Analyzes text to get local word frequency.
 * 2. Syncs words with the Global Dictionary (updates global usage stats).
 * 3. Merges data to calculate a "Significance Score" (Frequency * Level Weight).
 * 4. Identifies Top-20 most significant words for learning.
 * 5. Saves the submission and analysis to the database.
 *
 * @param {string} text - The raw text input from the user.
 * @param {string} userId - The ID of the user submitting the text.
 * @returns {Promise<Object>} An object containing the submission ID, stats, significant words, and full analysis.
 */
export async function handleTextSubmission(text, userId) {
  const frequencyData = extractKeywordsWithFrequency(text);
  const uniqueWords = frequencyData.map((item) => item.word);

  const dbWords = await syncWordsWithDB(uniqueWords);
  let fullAnalysis = frequencyData.map((freqItem) => {
    const dbInfo = dbWords.find((w) => w.word === freqItem.word);
    const level = dbInfo?.level || "Unknown";

    //Formula: (Frequency in the text) * (Word difficulty)
    const score = freqItem.count * getLevelWeight(level);

    return {
      word: freqItem.word,
      local_count: freqItem.count, // frequency in text submission
      global_count: dbInfo?.usage_count || 0, // frequency in db
      level: level,
      definition: dbInfo?.definition || "",
      translation: dbInfo?.translation || "",
      id: dbInfo?._id,
      significanceScore: score,
    };
  });

  const significantWords = [...fullAnalysis]
    .sort((a, b) => b.significanceScore - a.significanceScore)
    .slice(0, 20);

  const newSubmission = await TextSubmissionModel.create({
    user_id: userId,
    raw_text: text,
    normalized_words: uniqueWords,
    top_keywords: significantWords.map((w) => w.word),
  });

  return {
    submissionId: newSubmission._id,
    stats: {
      totalUniqueWords: uniqueWords.length,
      mostComplexWord: significantWords[0]?.word || null,
    },
    significantWords: significantWords,
    allWords: fullAnalysis.sort((a, b) => b.local_count - a.local_count),
  };
}
