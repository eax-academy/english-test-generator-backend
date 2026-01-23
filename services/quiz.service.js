import Quiz from "../models/quiz.model.js";
import Question from "../models/question.model.js";
import Word from "../models/word.model.js";

import { handleTextSubmission } from "./analyze.service.js";
import { translateToArmenian } from "../api/translateToArmenian.js";
import { fetchDefinitionAndPos } from "../api/fetchDefinition.js";

// -------------------- Utilities --------------------
const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const shuffleArray = (arr = []) => [...arr].sort(() => Math.random() - 0.5);
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateRandomSentence(word, pos) {
  const templates = {
    verb: `I usually ${word} the bag.`,
    noun: `This ${word} is very important.`,
    adjective: `It was a really ${word} moment.`,
    adverb: `He finished the task ${word}.`,
  };
  return templates[pos] || `Here is the word: ${word}.`;
}

// -------------------- Data Fetching --------------------
async function buildWordCache(keys) {
  const cache = new Map();
  await Promise.all(
    keys.map(async (word) => {
      try {
        const [translation, defData] = await Promise.all([
          translateToArmenian(word),
          fetchDefinitionAndPos(word),
        ]);
        if (defData) {
          cache.set(word.toLowerCase(), {
            word: word.toLowerCase(),
            translation: translation || null,
            definition: defData.definition,
            pos: defData.pos || "noun",
            level: defData.level || "Unknown",
          });
        }
      } catch (err) {
        console.error(`Error fetching data for ${word}:`, err);
      }
    })
  );
  return cache;
}

// -------------------- Question Generation --------------------
function getDistractors(correctValue, pool, cache, field, originalWord) {
  const distractors = pool
    .filter((w) => w !== originalWord)
    .map((w) => (field === "word" ? w : cache.get(w.toLowerCase())?.[field]))
    .filter((val) => val && val !== correctValue);
  return shuffleArray([...new Set(distractors)]).slice(0, 3);
}

export async function generateQuestions(keywords, text, type, total, cache) {
  const validWords = keywords.filter((w) => cache.has(w.toLowerCase()));
  if (!validWords.length) return [];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const questions = [];
  const types = type === "mixed" ? ["fill", "definition", "translation"] : [type];

  let attempts = 0;
  while (questions.length < total && attempts < total * 3) {
    const word = validWords[attempts % validWords.length];
    const meta = cache.get(word.toLowerCase());
    const selectedType = pickRandom(types);
    let q = null;

    if (selectedType === "fill") {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
      const chosen = pickRandom(sentences.filter((s) => regex.test(s))) || generateRandomSentence(word, meta.pos);
      q = {
        type: "fill",
        question: chosen.replace(regex, "_____"),
        answer: word,
        options: shuffleArray([word, ...getDistractors(word, validWords, cache, "word", word)]),
        wordKey: word.toLowerCase(),
      };
    } else if (selectedType === "definition" && meta.definition) {
      q = {
        type: "definition",
        question: `What is the meaning of "${word}"?`,
        answer: meta.definition,
        options: shuffleArray([meta.definition, ...getDistractors(meta.definition, validWords, cache, "definition", word)]),
        wordKey: word.toLowerCase(),
      };
    } else if (selectedType === "translation" && meta.translation) {
      q = {
        type: "translation",
        question: `Translate "${word}" to Armenian:`,
        answer: meta.translation,
        options: shuffleArray([meta.translation, ...getDistractors(meta.translation, validWords, cache, "translation", word)]),
        wordKey: word.toLowerCase(),
      };
    }

    if (q && !questions.some((prev) => prev.question === q.question)) {
      questions.push(q);
    }
    attempts++;
  }
  return questions;
}

// -------------------- Main Service --------------------
export async function createQuizService({ title, text, type = "mixed", difficulty = "basic", userId }) {
  if (!title || !text) throw new Error("Title and text required");

  const submission = await handleTextSubmission(text, userId);
  const sigWords = submission?.data?.significantWords;
  if (!sigWords || sigWords.length < 5) throw new Error("Not enough keywords found");

  // FIX 1: Normalize all keywords to lowercase and trim to prevent "Province" vs "province" issues
  const keywords = [...new Set(sigWords.map((w) => w.word.toLowerCase().trim()))];

  const cache = await buildWordCache(keywords);
  const validKeywords = keywords.filter((k) => cache.has(k));

  // FIX 2: Find existing words using normalized keys
  const existingWords = await Word.find({ word: { $in: validKeywords } });
  const wordMap = new Map(existingWords.map((w) => [w.word.toLowerCase(), w]));

  const wordsToCreate = validKeywords
    .filter((k) => !wordMap.has(k))
    .map((k) => ({
      word: k,
      lemma: k,
      level: cache.get(k).level,
      partOfSpeech: cache.get(k).pos,
      translation: cache.get(k).translation,
      definition: cache.get(k).definition,
    }));

  if (wordsToCreate.length > 0) {
    try {
      // FIX 3: Use ordered: false so if one word fails (duplicate), others still succeed
      const createdWords = await Word.insertMany(wordsToCreate, { ordered: false });
      createdWords.forEach((w) => wordMap.set(w.word.toLowerCase(), w));
    } catch (err) {
      // If error is code 11000 (duplicate), we can ignore it and fetch the ones that were just created by the other process
      if (err.code !== 11000) throw err;
      const refetched = await Word.find({ word: { $in: wordsToCreate.map(w => w.word) } });
      refetched.forEach((w) => wordMap.set(w.word.toLowerCase(), w));
    }
  }

  const questionBlueprints = await generateQuestions(validKeywords, text, type, 10, cache);

  // FIX 4: Ensure every question blueprint actually found a word in the wordMap
  const validBlueprints = questionBlueprints.filter(q => wordMap.has(q.wordKey));

  const questionDocs = await Question.insertMany(
    validBlueprints.map((q) => ({
      type: q.type,
      question: q.question,
      answer: q.answer,
      options: q.options,
      wordId: wordMap.get(q.wordKey)._id,
    }))
  );

  const quiz = await Quiz.create({
    title,
    textSubmissionId: submission.data.submissionId,
    difficulty,
    questions: questionDocs.map((q) => ({
      type: q.type,
      question: q.question,
      answer: q.answer,
      options: q.options,
      wordId: q.wordId,
    })),
    createdBy: userId,
  });

  return { quiz, stats: submission.data.stats };
}