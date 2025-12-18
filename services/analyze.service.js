/**
 * Word Service Module
 *
 * Responsibilities:
 * 1. NLP Analysis: Cleaning text, extracting, and counting significant words.
 * 2. Database Synchronization: Efficiently syncing words with the MongoDB dictionary.
 * 3. Data Aggregation: Calculating "Significance Scores" (Frequency + Difficulty + Global Relevance).
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

const englishWords = new Set(words.map((w) => w.toLowerCase()));

// --- Validation Helpers ---

const isValidInput = (text) => {
  return text && typeof text === "string" && text.trim().length > 0;
};

const getNormalizedRoot = (term) => {
  const rawRoot = term.root || term.normal || term.text;
  if (!rawRoot) return null;
  return rawRoot.replace(/[^a-zA-Z-]/g, "").toLowerCase();
};

const cleanInputText = (text) => {
  return text
    .replace(/([a-zA-Z])\.([a-zA-Z])/g, "$1 $2")
    .replace(/[\n\t\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// --- SCORING HELPERS (The Core Logic) ---

/**
 * Определяет вес на основе уровня CEFR.
 */
function getLevelWeight(level) {
  const weights = {
    Unknown: 3.0,
    C2: 4.0, C1: 3.0,
    B2: 2.0, B1: 1.5,
    A2: 0.5, A1: 0.1,
  };
  return weights[level] || 1;
}

/**
 * "Золотая середина".
 * Использует глобальную статистику (usage_count), чтобы найти самые полезные слова.
 */
function getRelevanceMultiplier(globalCount) {
  // 1. Слишком редкие или новые (защита от опечаток и мусора)
  if (!globalCount || globalCount < 5) {
    return 0.8; 
  }

  // 2. "ЗОЛОТАЯ ЗОНА" (Тематические слова)
  // Они встречаются достаточно часто, чтобы быть реальными, 
  // но не так часто, чтобы быть "водой".
  if (globalCount >= 5 && globalCount <= 500) {
    return 2.0; // Буст х2
  }

  // 3. Обычные слова
  if (globalCount > 500 && globalCount <= 2000) {
    return 1.0; 
  }

  // 4. "Заезженные" слова (Слова-паразиты, даже если они nouns/verbs)
  // Пример: "make", "time", "way"
  return 0.3; // Штраф
}

// --- MAIN EXPORTED FUNCTIONS ---

/**
 * 1. Extracts keywords from text using NLP.
 */
export function extractKeywordsWithFrequency(text) {
  if (!isValidInput(text)) return [];

  const cleanText = cleanInputText(text);
  const doc = nlp(cleanText);
  doc.compute("root"); 
  
  const sentences = doc.json();
  if (!sentences || sentences.length === 0) return [];

  const frequencyMap = new Map(); 

  for (const sentence of sentences) {
    for (const term of sentence.terms) {
      const root = getNormalizedRoot(term);

      if (!root || root.length < CONFIG.MIN_WORD_LENGTH || root.length > CONFIG.MAX_WORD_LENGTH) continue;
      if (!englishWords.has(root)) continue;

      const isTarget = term.tags.some((tag) => TARGET_TAGS.has(tag));
      const isJunk = term.tags.some((tag) => JUNK_TAGS.has(tag));
      const isSignificant = isTarget && !isJunk;

      if (frequencyMap.has(root)) {
        const entry = frequencyMap.get(root);
        entry.count++; 
      } else {
        frequencyMap.set(root, {
          lemma: root,
          original: term.text,
          count: 1, 
          isSignificant: isSignificant
        });
      }
    }
  } 
  return Array.from(frequencyMap.values());
}

/**
 * 2. Syncs a list of words with the Database (Upsert).
 */
export async function syncWordsWithDB(analyzedItems) {
  if (!analyzedItems || analyzedItems.length === 0) return [];

  const operations = analyzedItems.map((item) => ({
    updateOne: {
      filter: { word: item.lemma }, 
      update: {
        $setOnInsert: {
          word: item.lemma,
          lemma: item.lemma,
          level: "Unknown",
          definition: "",
          translation: "",
        },
        $inc: { usage_count: 1 }, 
      },
      upsert: true,
    },
  }));

  try {
    if (operations.length > 0) {
      await WordModel.bulkWrite(operations);
    }
    const lemmas = analyzedItems.map(i => i.lemma);
    return await WordModel.find({ word: { $in: lemmas } }).lean();
  } catch (error) {
    console.error("DB Sync Error:", error);
    throw new Error("Database synchronization failed.");
  }
}

/**
 * 3. MAIN CONTROLLER: Handles the full submission flow.
 */
export async function handleTextSubmission(text, userId) {
  if (!isValidInput(text)) return { success: false, error: "Invalid text." };

  try {
    // 1. NLP Analysis (Local Counts)
    const localAnalysis = extractKeywordsWithFrequency(text);
    if (localAnalysis.length === 0) return { success: false, error: "No words found." };

    // 2. Sync DB (Global Counts) - This updates usage_count!
    const dbWords = await syncWordsWithDB(localAnalysis);
    const dbWordsMap = new Map(dbWords.map((w) => [w.lemma, w]));

    // 3. Create Rich Objects with "Golden Mean" Scoring
    const richWordObjects = localAnalysis.map((item) => {
      const dbInfo = dbWordsMap.get(item.lemma);
      
      const level = dbInfo?.level || "Unknown";
      const globalCount = dbInfo?.usage_count || 1;

      // --- SCORING FORMULA ---
      const difficultyWeight = getLevelWeight(level);       // CEFR
      const relevanceWeight = getRelevanceMultiplier(globalCount); // Golden Mean Logic
      const localFreq = item.count;                         // How many times in THIS text

      const score = (localFreq * difficultyWeight) * relevanceWeight;

      return {
        word: item.original,
        lemma: item.lemma,
        word_id: dbInfo?._id,
        count: item.count,
        significanceScore: parseFloat(score.toFixed(2)),
        isSignificant: item.isSignificant
      };
    });

    // 4. Create Simple Strings for `top_keywords` (Sort by Score)
    const topKeywordsStrings = richWordObjects
      .filter(w => w.isSignificant)
      .sort((a, b) => b.significanceScore - a.significanceScore)
      .slice(0, TOP_KEYWORDS_LIMIT)
      .map(w => w.word); 

    // 5. Save to MongoDB
    const newSubmission = await TextSubmissionModel.create({
      user_id: userId,
      raw_text: text,
      normalized_words: richWordObjects, 
      top_keywords: topKeywordsStrings,
    });

    // 6. Filter & Sort significant words for the API Response
    const significantWords = richWordObjects
      .filter(w => w.isSignificant && w.word_id) 
      .sort((a, b) => b.significanceScore - a.significanceScore)
      .slice(0, TOP_KEYWORDS_LIMIT);

    return {
      success: true,
      data: {
        submissionId: newSubmission._id,
        stats: {
          totalUniqueWords: richWordObjects.length,
          significantWordCount: significantWords.length
        },
        significantWords: significantWords, 
        allWords: richWordObjects // Optional: remove if payload is too big
      },
    };

  } catch (error) {
    console.error("Error in handleTextSubmission:", error);
    return { success: false, error: "Internal processing error." };
  }
}