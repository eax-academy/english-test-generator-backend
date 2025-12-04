import Quiz from "../models/quiz.model.js";
import { handleTextSubmission } from "./analyze.service.js";
import { translateToArmenian } from "../api/translateToArmenian.js";
import { fetchDefinitionAndPos } from "../api/fetchDefinition.js";

// -------------------- Utilities --------------------
function escapeRegExp(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shuffleArray(arr = []) {
  return arr
    .map(x => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.x);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function replaceWordWithBlank(sentence, word) {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  return regex.test(sentence) ? sentence.replace(regex, "____") : `Fill in the blank: ${word}`;
}

// -------------------- Random Sentence Generator --------------------
function generateRandomSentence(word, pos) {
  const subjects = ["The scientist", "An artist", "The engineer", "The teacher"];
  const verbs = ["observes", "analyzes", "creates", "examines"];
  const objects = ["a phenomenon", "a problem", "a discovery", "an experiment"];

  if (pos === "verb") return `I will ${word} the task.`;
  if (pos === "noun") return `${pickRandom(subjects)} notices ${word}.`;
  if (pos === "adjective") return `It was a ${word} day.`;
  if (pos === "adverb") return `She runs ${word}.`;

  return `${pickRandom(subjects)} encounters ${word}.`;
}

// -------------------- Fill Question Generator --------------------
async function makeFillQuestion(word, pool = [], cache, text) {
  const meta = cache.get(word) || {};
  const pos = meta.pos || "noun";

  // Extract sentences containing the word from the text
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(s => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(s));

  let sentence = sentences.length ? pickRandom(sentences) : generateRandomSentence(word, pos);
  const questionText = replaceWordWithBlank(sentence, word);

  // Distractors: other words of same POS
  const distractors = shuffleArray(
    pool.filter(k => k.toLowerCase() !== word.toLowerCase() && (cache.get(k)?.pos || "") === pos)
  ).slice(0, 3);

  return {
    type: "fill",
    question: questionText,
    answer: word,
    options: shuffleArray([word, ...distractors]),
  };
}

// -------------------- Definition & Translation --------------------
async function makeDefinitionQuestion(word, meta, keywords, cache) {
  const correct = meta.definition || "Definition not found";
  const distractors = shuffleArray(
    keywords
      .filter(k => k !== word)
      .map(k => cache.get(k)?.definition)
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
  const correct = meta.translation || word;
  const distractors = shuffleArray(
    keywords
      .filter(k => k !== word)
      .map(k => cache.get(k)?.translation)
      .filter(Boolean)
  ).slice(0, 3);

  return {
    type: "translation",
    question: `Translate "${word}" to Armenian:`,
    answer: correct,
    options: shuffleArray([correct, ...distractors]),
  };
}

// -------------------- Build Word Cache --------------------
const wordCache = new Map();

async function buildWordCache(keywords = []) {
  await Promise.all(
    keywords.map(async k => {
      if (!wordCache.has(k)) {
        const [translation, defPos] = await Promise.all([
          translateToArmenian(k),
          fetchDefinitionAndPos(k),
        ]);
        wordCache.set(k, {
          translation,
          definition: defPos?.definition || k,
          pos: defPos?.pos || "noun",
          example: defPos?.example || "",
        });
      }
    })
  );
  return wordCache;
}

// -------------------- Quiz Generator --------------------
export async function generateQuiz(keywords, text, type = "mixed", total = 10) {
  const uniq = shuffleArray([...new Set(keywords.map(k => k.toLowerCase()))]);
  const cache = await buildWordCache(uniq);

  const questions = [];
  const qTypes = type === "mixed" ? ["fill", "definition", "translation"] : [type];
  let i = 0;

  while (questions.length < total && i < uniq.length * 10) {
    const word = uniq[i % uniq.length];
    const meta = cache.get(word) || {};
    const choice = pickRandom(qTypes);

    let q;
    if (choice === "fill") q = await makeFillQuestion(word, uniq, cache, text);
    if (choice === "definition") q = await makeDefinitionQuestion(word, meta, uniq, cache);
    if (choice === "translation") q = makeTranslationQuestion(word, meta, uniq, cache);

    if (q && !questions.some(x => x.question === q.question)) questions.push(q);
    i++;
  }

  return questions.slice(0, total);
}

// -------------------- Create Quiz Service --------------------
export async function createQuizService({ title, text, type = "mixed", difficulty = "basic", userId }) {
  if (!title || !text) throw new Error("Title and text required");

  const submission = await handleTextSubmission(text, userId);
  const keywords = submission.significantWords.map(w => w.word);

  if (keywords.length < 5) throw new Error("Not enough keywords for quiz");

  const questions = await generateQuiz(keywords, text, type, 10);

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

// -------------------- CRUD Endpoints --------------------
export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "Quiz deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
