import Quiz from "../models/quiz.model.js";
import Word from "../models/word.model.js";

import { handleTextSubmission } from "./analyze.service.js";
import { translateToArmenian } from "../api/translateToArmenian.js";
import { fetchDefinitionAndPos } from "../api/fetchDefinition.js";


// -------------------- Quiz Utilities --------------------
function escapeRegExp(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shuffleArray(arr = []) {
  return arr
    .map(x => ({ val: x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.val);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


// -------------------- Sentence & Distractors --------------------
function replaceWordWithBlank(sentence, word) {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
  return sentence.replace(regex, "_____");
}

function generateRandomSentence(word, pos) {
  if (pos === "verb") return `I usually ${word} the bag.`;
  if (pos === "noun") return `This ${word} is very important.`;
  if (pos === "adjective") return `It was a really ${word} moment.`;
  if (pos === "adverb") return `He finished the task ${word}.`;
  return `Here is the word: ${word}.`;
}


// ---------------------- Question Makers --------------------
async function makeFillQuestion(word, pool = [], cache, text) {
  const meta = cache.get(word) || {};
  const pos = meta.pos || "noun";

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(s => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(s));

  const chosen = sentences.length ? pickRandom(sentences) : generateRandomSentence(word, pos);
  const question = replaceWordWithBlank(chosen, word);

  let distractors = shuffleArray(
    pool.filter(k =>
      k.toLowerCase() !== word.toLowerCase() &&
      (cache.get(k)?.pos || "") === pos &&
      k !== meta.translation &&
      k && typeof k === "string"
    )
  ).slice(0, 3);

  if (distractors.length < 3) {
    const more = shuffleArray(
      pool.filter(k =>
        k.toLowerCase() !== word.toLowerCase() &&
        !distractors.includes(k) &&
        k && typeof k === "string"
      )
    ).slice(0, 3 - distractors.length);
    distractors = [...distractors, ...more];
  }

  distractors = [...new Set(distractors)].filter(Boolean).slice(0, 3);

  return {
    type: "fill",
    question,
    answer: word,
    options: shuffleArray([word, ...distractors]),
  };
}

async function makeDefinitionQuestion(word, meta, keywords, cache) {
  const correct = meta?.definition || null;
  if (!correct) return null;
  let distractors = shuffleArray(
    keywords
      .filter(k => k !== word)
      .map(k => cache.get(k)?.definition)
      .filter(Boolean)
      .filter(d => d !== correct)
  ).slice(0, 3);

  distractors = [...new Set(distractors)].filter(Boolean).slice(0, 3);

  return {
    type: "definition",
    question: `What is the meaning of "${word}"?`,
    answer: correct,
    options: shuffleArray([correct, ...distractors]),
  };
}

function makeTranslationQuestion(word, meta, keywords, cache) {
  const correct = meta?.translation || null;
  if (!correct) return null;
  let distractors = shuffleArray(
    keywords
      .filter(k => k !== word)
      .map(k => cache.get(k)?.translation)
      .filter(Boolean)
      .filter(t => t !== correct)
  ).slice(0, 3);

  distractors = [...new Set(distractors)].filter(Boolean).slice(0, 3);

  return {
    type: "translation",
    question: `Translate "${word}" to Armenian:`,
    answer: correct,
    options: shuffleArray([correct, ...distractors]),
  };
}


// -------------------- Word Data Cache --------------------
const wordCache = new Map();

async function getValidDefinition(word) {
  const def = await fetchDefinitionAndPos(word);
  if (!def) return null; // skip this word if no definition
  return { word, ...def };
}

async function buildWordCache(keys = []) {
  for (const k of keys) {
    if (!wordCache.has(k)) {
      const [translation, defData] = await Promise.all([
        translateToArmenian(k),
        getValidDefinition(k),
      ]);

      if (defData) {
        wordCache.set(k, {
          translation: translation || null,
          definition: defData.definition,
          pos: defData.pos || "noun",
          example: defData.example || null,
        });
      }
    }
  }
  return wordCache;
}

// -------------------- Quiz Generator --------------------
export async function generateQuiz(keywords, text, type = "mixed", total = 10) {
  const uniq = [...new Set(keywords)].filter(Boolean);
  const cache = await buildWordCache(uniq);

  // Only use words that have valid cache entries
  const validWords = uniq.filter(w => cache.has(w));
  if (!validWords.length) return [];

  const questions = [];
  const types = type === "mixed" ? ["fill", "definition", "translation"] : [type];

  while (questions.length < total) {
    const word = pickRandom(validWords);
    const meta = cache.get(word);
    if (!meta) continue;

    const t = pickRandom(types);
    let q = null;

    if (t === "fill") q = await makeFillQuestion(word, validWords, cache, text);
    if (t === "definition") q = await makeDefinitionQuestion(word, meta, validWords, cache);
    if (t === "translation") q = makeTranslationQuestion(word, meta, validWords, cache);

    if (
      q &&
      q.question &&
      q.options &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      !questions.some(existing => existing.question === q.question)
    ) {
      questions.push(q);
    }

    if (questions.length + validWords.length < total) break;
  }

  return questions.slice(0, total);
}


// -------------------- Create Quiz API --------------------
export async function createQuizService({ title, text, type = "mixed", difficulty = "basic", userId }) {
  if (!title || !text) throw new Error("Title and text required");

  const submission = await handleTextSubmission(text, userId);
  const keywords = submission.significantWords.map(w => w.word);

  if (keywords.length < 5) throw new Error("Not enough keywords to generate quiz");

  const questions = await generateQuiz(keywords, text, type, 10);

  // Ensure each question has a wordId
  const wordDocs = await Promise.all(
    keywords.map(async (k) => {
      let word = await Word.findOne({ word: k });
      if (!word) word = await Word.create({ word: k });
      
      return word;
    })
  );

  const questionsWithWordId = questions.map((q, i) => ({
    ...q,
    wordId: wordDocs[i % wordDocs.length]._id
  }));

  const quiz = await Quiz.create({
    title,
    textSubmissionId: submission.submissionId,
    type,
    difficulty,
    keywords,
    questions: questionsWithWordId,
    createdBy: userId,
  });

  return { quiz, stats: submission.stats };
}


