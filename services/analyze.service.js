/**
 * Word Service Module
 *
 * Responsibilities:
 * 1. NLP Analysis: Extracting and counting significant words from raw text.
 * 2. Database Synchronization: Ensuring words exist in the MongoDB dictionary.
 * 3. Data Aggregation: Merging frequency data with dictionary metadata.
 */
import nlp from "compromise";
import WordModel from "../models/word.model.js";

/**
 * Extracts significant keywords from text and calculates their frequency.
 *
 * Uses 'compromise' NLP to:
 * - Lemmatize words (convert to root form: "running" -> "run").
 * - Filter for Nouns, Verbs, and Adjectives.
 * - Remove stop words, pronouns, and prepositions.
 *
 * @param {string} text - The raw input text to analyze.
 * @returns {Array<{word: string, count: number}>} An array of objects sorted by frequency (descending).
 *
 * @example
 * extractKeywordsWithFrequency("Cats are running.");
 * // returns [{ word: "cat", count: 1 }, { word: "run", count: 1 }]
 */
export function extractKeywordsWithFrequency(text) {
  console.log("📥 Input text:", `"${text}"`);
  if (!text || typeof text !== "string" || text.trim().length === 0) return [];

  const doc = nlp(text);
  doc.compute("root"); // Normalize words to their root form

  const allData = doc.json();
  if (!allData || allData.length === 0) {
    console.error("❌ CRITICAL: Compromise returned empty JSON.");
    return [];
  }

  const frequencyMap = {};
  // Iterate through sentences and terms to build frequency map
  allData.forEach((sentence) => {
    sentence.terms.forEach((term) => {
      const tags = term.tags || [];
      const root = term.root || term.normal || term.text;
      // Filter Logic: Keep Nouns/Verbs/Adjectives
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
      const isValidLength = root.length >= 3;

      if (isTarget && !isJunk && isValidLength) {
        frequencyMap[root] = (frequencyMap[root] || 0) + 1;
      }
    });
  });

  const sortedResult = Object.keys(frequencyMap)
    .map((word) => ({
      word: word,
      count: frequencyMap[word],
    }))
    .sort((a, b) => b.count - a.count); // Сортировка: частые сверху

  console.log(`✅ Extracted ${sortedResult.length} unique keywords.`);
  return sortedResult;
}

/**
 * Synchronizes a list of words with the MongoDB database.
 *
 * Checks if words exist in the DB. If a word is missing, it creates a new entry
 * with default values (which can later be updated via an external dictionary API).
 *
 * @param {string[]} wordsList - Array of unique word strings (roots).
 * @returns {Promise<Array<Object>>} A promise resolving to an array of Mongoose documents.
 */
export async function syncWordsWithDB(wordsList) {
  if (!Array.isArray(wordsList) || wordsList.length === 0) return [];

  const dbResults = [];

  // OPTIMIZATION: Use Promise.all instead of await inside a loop
  // This runs all DB checks in parallel -> Much faster
  const promises = wordsList.map(async (word) => {
    try {
      let wordData = await WordModel.findOne({ word });
      if (!wordData) {
        wordData = await WordModel.create({
          word,
          level: "Unknown",
          definition: `Definition of ${word}`,
        });
      }
      return wordData;
    } catch (err) {
      console.error(`DB Error on ${word}:`, err.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((item) => item !== null); // Remove failed entries
}

/**
 * Orchestrator function: Analyzes text and enriches it with database data.
 *
 * 1. Extracts keywords and counts from text.
 * 2. Ensures all extracted keywords exist in the database.
 * 3. Merges the frequency data (from text) with metadata (level, definition from DB).
 *
 * @param {string} text - The raw input text.
 * @returns {Promise<Array<{word: string, count: number, level: string, definition: string, id: string}>>}
 * Combined result for the frontend or quiz generation.
 */
export async function processTextAnalysis(text) {
  const frequencyData = extractKeywordsWithFrequency(text);
  if (frequencyData.length === 0) return [];

  const wordsStrings = frequencyData.map((item) => item.word);
  const dbData = await syncWordsWithDB(wordsStrings);

  const finalResult = frequencyData.map((freqItem) => {
    const dbInfo = dbData.find((dbItem) => dbItem.word === freqItem.word);

    return {
      word: freqItem.word,
      count: freqItem.count,
      level: dbInfo?.level || "Unknown",
      definition: dbInfo?.definition || "",
      id: dbInfo?._id,
    };
  });

  // return finalResult;
}
