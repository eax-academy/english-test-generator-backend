/**
 * Word Service Module
 *
 * Responsibilities:
 * 1. NLP Analysis: Cleaning text, extracting, and counting significant words.
 * 2. Database Synchronization: Efficiently syncing words with the MongoDB dictionary.
 * 3. Data Aggregation: Calculating "Significance Scores".
 * 4. Submission Handling: Saving user text history.
 */

import nlp from "compromise";
import words from "an-array-of-english-words" with { type: 'json' };
import WordModel from "../models/word.model.js";
import TextSubmissionModel from "../models/textSubmission.model.js";

// --- Constants & Configuration ---

const CONFIG = {
  MIN_WORD_LENGTH: 2,
  MAX_WORD_LENGTH: 45,
};

const TARGET_TAGS = new Set(["Noun", "Verb", "Adjective", "Expression", "Adverb"]);
const JUNK_TAGS = new Set([
  "Preposition",
  "Pronoun",
  "Conjunction",
  "Determiner",
  "Auxiliary",
  "Modal",
]);

const TOP_KEYWORDS_LIMIT = 20;

// Load dictionary into memory once (O(1) access)
const englishWords = new Set(words.map((w) => w.toLowerCase()));


// --- Validation Helpers ---

/**
 * Validates the raw input text from the user.
 */
const isValidInput = (text) => {
  return text && typeof text === "string" && text.trim().length > 0;
};

/**
 * Checks basic word structure (length).
 */
const isValidWordStructure = (word) => {
  return (
    word &&
    word.length >= CONFIG.MIN_WORD_LENGTH &&
    word.length <= CONFIG.MAX_WORD_LENGTH
  );
};

/**
 * Checks if the word actually exists in the English dictionary.
 */
const isValidEnglishWord = (word) => {
  if (!word) return false;
  return englishWords.has(word.toLowerCase());
};

/**
 * NLP Check: Keep Nouns/Verbs, discard Prepositions/Junk.
 */
const hasValidTags = (tags = []) => {
  const isTarget = tags.some((tag) => TARGET_TAGS.has(tag));
  const isJunk = tags.some((tag) => JUNK_TAGS.has(tag));
  return isTarget && !isJunk;
};


// --- Text Processing Helpers ---

/**
 * Normalizes text (removes weird spacing, handles merged periods).
 */
const cleanInputText = (text) => {
  return text
    .replace(/([a-zA-Z])\.([a-zA-Z])/g, "$1 $2") // "end.Start" -> "end Start"
    .replace(/[\n\t\r]/g, " ")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
};

/**
 * Extracts the root/normal form of a word using Compromise NLP.
 */
const getNormalizedRoot = (term) => {
  const rawRoot = term.root || term.normal || term.text;
  if (!rawRoot) return null;
  return rawRoot.replace(/[^a-zA-Z-]/g, "").toLowerCase();
};

/**
 * Formats the frequency map into a sorted array.
 */
const formatOutput = (frequencyMap) => {
  return Object.keys(frequencyMap)
    .map((word) => ({ word, count: frequencyMap[word] }))
    .sort((a, b) => b.count - a.count);
};


// --- Core Analysis Helpers ---

/**
 * Determines weight based on CEFR level.
 */
function getLevelWeight(level) {
  const weights = {
    Unknown: 5.0,
    C2: 4.0, C1: 3.0,
    B2: 2.0, B1: 1.5,
    A2: 0.5, A1: 0.1,
  };
  return weights[level] || 1;
}

/**
 * Merges local text frequency with Global DB data to calculate scores.
 */
function generateWordAnalysis(frequencyData, dbWords) {
  const dbWordsMap = new Map(dbWords.map((w) => [w.word, w]));

  return frequencyData.map((freqItem) => {
    const dbInfo = dbWordsMap.get(freqItem.word);
    const level = dbInfo?.level || "Unknown";

    // Formula: Frequency * Complexity
    const score = freqItem.count * getLevelWeight(level);

    return {
      word: freqItem.word,
      local_count: freqItem.count,
      global_count: dbInfo?.usage_count || 0,
      level: level,
      definition: dbInfo?.definition || "",
      translation: dbInfo?.translation || "",
      id: dbInfo?._id,
      significanceScore: score,
    };
  });
}

/**
 * Sorts by score and slices top N words.
 */
function getSignificantWords(analysis, limit) {
  return [...analysis]
    .sort((a, b) => b.significanceScore - a.significanceScore)
    .slice(0, limit);
}

/**
 * Formats the final API response.
 */
function formatResponse(submission, uniqueWords, significantWords, fullAnalysis) {
  return {
    success: true,
    data: {
      submissionId: submission._id,
      stats: {
        totalUniqueWords: uniqueWords.length,
        mostComplexWord: significantWords[0]?.word || null,
      },
      significantWords: significantWords,
      // All words sorted by frequency in this specific text
      allWords: [...fullAnalysis].sort((a, b) => b.local_count - a.local_count),
    },
  };
}


// --- MAIN EXPORTED FUNCTIONS ---

/**
 * 1. Extracts keywords from text using NLP.
 */
export function extractKeywordsWithFrequency(text) {
  // Here returning [] is correct because this function returns a list
  if (!isValidInput(text)) return [];

  const cleanText = cleanInputText(text);
  const doc = nlp(cleanText);

  doc.compute("root");
  const sentences = doc.json();

  if (!sentences || sentences.length === 0) return [];

  const frequencyMap = {};

  for (const sentence of sentences) {
    for (const term of sentence.terms) {
      const root = getNormalizedRoot(term);

      // Fast-fail checks
      if (!isValidWordStructure(root)) continue;
      if (!hasValidTags(term.tags)) continue;
      if (!isValidEnglishWord(root)) continue;

      frequencyMap[root] = (frequencyMap[root] || 0) + 1;
    }
  }

  return formatOutput(frequencyMap);
}

/**
 * 2. Syncs a list of words with the Database (Upsert).
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
        $inc: { usage_count: 1 }, // increment global usage
      },
      upsert: true,
    },
  }));

  try {
    if (operations.length > 0) {
      await WordModel.bulkWrite(operations);
    }
    return await WordModel.find({ word: { $in: wordsList } }).lean();
  } catch (error) {
    console.error("DB Sync Error:", error);
    throw new Error("Database synchronization failed.");
  }
}

/**
 * 3. MAIN CONTROLLER: Handles the full submission flow.
 */
export async function handleTextSubmission(text, userId) {
  // Validate Input - Return Object (Not Array!)
  if (!isValidInput(text)) {
    return { success: false, error: "Invalid or empty text provided." };
  }

  try {
    // Step 1: NLP Analysis
    const frequencyData = extractKeywordsWithFrequency(text);

    if (frequencyData.length === 0) {
      return { success: false, error: "No valid English words found in text." };
    }

    const uniqueWords = frequencyData.map((item) => item.word);

    // Step 2: Database Sync
    const dbWords = await syncWordsWithDB(uniqueWords);

    // Step 3: Analysis & Scoring
    const fullAnalysis = generateWordAnalysis(frequencyData, dbWords);
    const significantWords = getSignificantWords(fullAnalysis, TOP_KEYWORDS_LIMIT);

    // Step 4: Save History
    const newSubmission = await TextSubmissionModel.create({
      user_id: userId,
      raw_text: text,
      normalized_words: uniqueWords,
      top_keywords: significantWords.map((w) => w.word),
    });

    
    const response = formatResponse(newSubmission, uniqueWords, significantWords, fullAnalysis);
    return response.data
  } catch (error) {
    console.error("Error in handleTextSubmission:", error);
    return { success: false, error: "Internal processing error." };
  }
}