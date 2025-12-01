import Quiz from "../models/quiz.model.js";
import fetch from "node-fetch";

// ---------------- External APIs ----------------
async function translateToArmenian(word) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      word
    )}&langpair=en|hy`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.responseData?.translatedText ?? word;
  } catch {
    return word;
  }
}

async function fetchDefinitionAndPos(word) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      word
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    const entry = Array.isArray(data) && data.length ? data[0] : null;
    const meaning = entry?.meanings?.[0];
    const def =
      meaning?.definitions?.[0]?.definition || "Definition unavailable";
    const pos = meaning?.partOfSpeech || "noun";
    return { definition: def, pos };
  } catch {
    return { definition: "Definition unavailable", pos: "noun" };
  }
}

// ---------------- Utilities ----------------
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

function guessPos(word, definition = "") {
  const w = word.toLowerCase();
  if (w.endsWith("ly")) return "adverb";
  if (/(ing|ize|ise|ate|fy|en)$/.test(w)) return "verb";
  if (/(ed|ive|ous|al|able|ic|y|ful|less)$/.test(w)) return "adjective";
  if (/^[A-Z]/.test(word)) return "proper";
  return "noun";
}

// ---------------- Word Cache ----------------
async function buildWordCache(keywords = []) {
  const cache = new Map();
  await Promise.all(
    keywords.map(async (k) => {
      const [translation, defPos] = await Promise.all([
        translateToArmenian(k),
        fetchDefinitionAndPos(k),
      ]);
      const pos = defPos.pos || guessPos(k, defPos.definition);
      cache.set(k, { translation, definition: defPos.definition, pos });
    })
  );
  return cache;
}

// ---------------- Templates ----------------
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

// ---------------- Question Generators ----------------
function makeFillQuestion(word, meta, pool) {
  const pos = meta.pos || "noun";
  const templates = TEMPLATES[pos] || TEMPLATES.noun;
  let sentence = templates[Math.floor(Math.random() * templates.length)](word);
  const questionText = sentence.replace(
    new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
    "____"
  );

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

// ---------------- Main Quiz Generator ----------------
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
    if (choice === "definition")
      q = await makeDefinitionQuestion(word, meta, uniq, cache);
    if (choice === "translation")
      q = makeTranslationQuestion(word, meta, uniq, cache);

    if (q && !questions.some((x) => x.question === q.question)) {
      questions.push(q);
    }

    i++;
    if (i > uniq.length * 10) break;
  }

  return questions.slice(0, total);
}

// ---------------- Controllers ----------------
export async function createQuiz(req, res) {
  try {
    const { title, text, keywords, difficulty = "basic", type = "mixed" } =
      req.body;

    if (!title || !text)
      return res.status(400).json({ message: "Title and text required" });

    if (!Array.isArray(keywords) || keywords.length < 5)
      return res
        .status(400)
        .json({ message: "Provide at least 5 keywords for quiz generation" });

    const questions = await generateQuiz(keywords, type, 10);

    const quiz = new Quiz({
      title,
      text,
      difficulty,
      type,
      keywords,
      questions,
      createdBy: req.user?.id || null,
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    console.error("Quiz creation error:", err);
    res.status(500).json({ message: "Failed to create quiz" });
  }
}

export async function getAllQuizzes(req, res) {
  try {
    res.json(await Quiz.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: "Error fetching quizzes" });
  }
}

export async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Not found" });
    res.json(quiz);
  } catch {
    res.status(500).json({ message: "Error fetching quiz" });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting quiz" });
  }
}
