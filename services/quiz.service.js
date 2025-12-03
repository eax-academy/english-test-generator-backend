import Quiz from "../models/quiz.model.js";
import { handleTextSubmission } from "./analyze.service.js";
import { translateToArmenian } from "../api/translateToArmenian.js";
import { fetchDefinitionAndPos } from "../api/fetchDefinition.js";

// -------------------- Utility Functions --------------------
function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function escapeRegExp(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shuffleArray(arr = []) {
  return arr
    .map((x) => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.x);
}

function guessPos(word) {
  const w = word.toLowerCase();
  if (w.endsWith("ly")) return "adverb";
  if (/(ing|ize|ise|ate|fy|en)$/.test(w)) return "verb";
  if (/(ed|ive|ous|al|able|ic|y|ful|less)$/.test(w)) return "adjective";
  if (/^[A-Z]/.test(word)) return "proper";
  return "noun";
}

// -------------------- Build Word Metadata Cache --------------------
async function buildWordCache(keywords = []) {
  const cache = new Map();
  await Promise.all(
    keywords.map(async (k) => {
      const [translation, defPos] = await Promise.all([
        translateToArmenian(k),
        fetchDefinitionAndPos(k),
      ]);
      const pos = defPos.pos || guessPos(k);
      cache.set(k, { translation, definition: defPos.definition, pos });
    })
  );
  return cache;
}

// -------------------- Question Templates --------------------
const TEMPLATES = {
  verb: [
    (w) => `I ${w} every day.`,
    (w) => `They will ${w} tomorrow.`,
    (w) => `Can you ${w} without help?`,
    (w) => `We often ${w} together.`,
  ],
  noun: [
    (w) => `The ${w} is important.`,
    (w) => `I saw a ${w} yesterday.`,
    (w) => `${capitalize(w)} is amazing.`,
    (w) => `Many ${w}s are here.`,
  ],
  adjective: [
    (w) => `It was a very ${w} day.`,
    (w) => `She has a ${w} idea.`,
    (w) => `They wore ${w} clothes.`,
    (w) => `What a ${w} experience!`,
  ],
  proper: [
    (w) => `${capitalize(w)} is famous for its services.`,
    (w) => `Many people use ${capitalize(w)} every day.`,
  ],
};

// -------------------- Question Generators --------------------
function makeFillQuestion(word, meta, pool) {
  const pos = meta.pos || "noun";
  const templates = TEMPLATES[pos] || TEMPLATES.noun;
  const sentence = templates[Math.floor(Math.random() * templates.length)](word);
  const questionText = sentence.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"), "____");
  const distractors = shuffleArray(pool.filter((k) => k !== word)).slice(0, 3);

  return {
    type: "fill",
    question: questionText,
    answer: word,
    options: shuffleArray([word, ...distractors]),
  };
}

async function makeDefinitionQuestion(word, meta, keywords, cache) {
  const correct = meta.definition;
  const distractors = shuffleArray(
    keywords
      .filter((k) => k !== word)
      .map((k) => cache.get(k)?.definition)
      .filter(Boolean)
  ).slice(0, 3);

  return {
    type: "definition",
    question: `What is the meaning of "${word}"?`,
    answer: correct,
    options: shuffleArray([correct, ...distractors]),
  };
}

function makeTranslationQuestion(word, meta, keywords, cache) {
  const correct = meta.translation;
  const distractors = shuffleArray(
    keywords
      .filter((k) => k !== word)
      .map((k) => cache.get(k)?.translation)
      .filter(Boolean)
  ).slice(0, 3);

  return {
    type: "translation",
    question: `Translate "${word}" to Armenian:`,
    answer: correct,
    options: shuffleArray([correct, ...distractors]),
  };
}

// -------------------- Main Quiz Generator --------------------
export async function generateQuiz(keywords, type = "mixed", total = 10) {
  const uniq = [...new Set(keywords.map((k) => k.toLowerCase()))];
  const cache = await buildWordCache(uniq);

  const questions = [];
  const qTypes = type === "mixed" ? ["fill", "definition", "translation"] : [type];

  let i = 0;
  while (questions.length < total) {
    const word = uniq[i % uniq.length];
    const meta = cache.get(word);
    const choice = qTypes[Math.floor(Math.random() * qTypes.length)];

    let q;
    if (choice === "fill") q = makeFillQuestion(word, meta, uniq);
    if (choice === "definition") q = await makeDefinitionQuestion(word, meta, uniq, cache);
    if (choice === "translation") q = makeTranslationQuestion(word, meta, uniq, cache);

    if (q && !questions.some((x) => x.question === q.question)) {
      questions.push(q);
    }

    i++;
    if (i > uniq.length * 10) break; // safety
  }

  return questions.slice(0, total);
}

// -------------------- Create Quiz Service --------------------
export async function createQuizService({ title, text, type = "mixed", difficulty = "basic", userId }) {
  if (!title || !text) throw new Error("Title and text required");

  // 1️⃣ Analyze text
  const submission = await handleTextSubmission(text, userId);
  const keywords = submission.significantWords.map((w) => w.word);

  if (keywords.length < 5) throw new Error("Not enough keywords extracted to generate quiz");

  // 2️⃣ Generate quiz questions
  const questions = await generateQuiz(keywords, type, 10);

  // 3️⃣ Save quiz to DB
  const quiz = await Quiz.create({
    title,
    text,
    difficulty,
    type,
    keywords,
    questions,
    submissionId: submission.submissionId,
    createdBy: userId,
  });

  return { quiz, keywords, stats: submission.stats };
}


// --- Fetch all quizzes ---
export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// --- Fetch a single quiz ---
export async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// --- Delete quiz ---
export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
