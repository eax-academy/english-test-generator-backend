import Quiz from '../models/quiz.model.js';
import fetch from "node-fetch";

// ---------------- Keyword Extraction ----------------
function extractKeywords(text, difficulty = "beginner") {
  const words = text
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  const freq = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));

  const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);

  const counts = {
    beginner: 5,
    intermediate: 8,
    advanced: 12
  };

  return sorted.slice(0, counts[difficulty] || 5);
}

// ---------------- External APIs ----------------

// English → Armenian translation
async function translateToArmenian(word) {
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: word,
        source: "en",
        target: "hy", 
        format: "text"
      })
    });

    const data = await res.json();
    return data?.translatedText || word;
  } catch {
    return word; 
  }
}

// Dictionary API – fetch English definition
async function fetchDefinition(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const data = await res.json();
    return data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ||
      `Meaning of ${word}`;
  } catch {
    return `Meaning of ${word}`;
  }
}

// ---------------- Helpers ----------------
const sentenceTemplates = [
  word => `I ${word} every day.`,
  word => `They want to ${word} now.`,
  word => `We will ${word} tomorrow morning.`,
  word => `Can you ${word} without help?`,
  word => `She likes to ${word} after school.`
];

function shuffleArray(arr) {
  return arr
    .map(x => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.x);
}

const armenianDistractors = [
  "տուփ", "գործ", "գիրք", "տուն", "մարդ",
  "գարուն", "գիշեր", "երեկո", "ընկեր", "խաղ"
];

const definitionDistractors = [
  "A general concept",
  "Something used in life",
  "A word found in dictionaries",
  "Commonly known term"
];

// 🧠 Generates Quiz Questions
async function generateQuiz(keywords, type = "mixed") {
  const questions = [];

  for (const word of keywords) {
    let qType = type;
    if (type === "mixed") {
      const types = ["fill", "translation", "definition"];
      qType = types[Math.floor(Math.random() * types.length)];
    }

    // Fill-in-the-blank
    if (qType === "fill") {
      const tmpl = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
      const fullSentence = tmpl(word);
      questions.push({
        type: "fill",
        question: fullSentence.replace(word, "____"),
        fullSentence,
        answer: word
      });
    }

    // Translation
    if (qType === "translation") {
      const translation = await translateToArmenian(word);
      const options = shuffleArray([
        translation,
        ...shuffleArray(armenianDistractors).slice(0, 3)
      ]).slice(0, 4);

      questions.push({
        type: "translation",
        question: `What is the Armenian equivalent of "${word}"?`,
        options,
        answer: translation
      });
    }

    // Definition
    if (qType === "definition") {
      const def = await fetchDefinition(word);
      const options = shuffleArray([
        def,
        ...shuffleArray(definitionDistractors).slice(0, 3)
      ]).slice(0, 4);

      questions.push({
        type: "definition",
        question: `Choose the correct meaning of "${word}"`,
        options,
        answer: def
      });
    }
  }

  return shuffleArray(questions);
}

// ---------------- Controllers ----------------

export async function createQuiz(req, res) {
  try {
    const { title, text, difficulty = "beginner", type = "mixed" } = req.body;

    if (!text || !title) {
      return res.status(400).json({ message: "Title and text required" });
    }

    const safeDifficulty = ["beginner", "intermediate", "advanced"]
      .includes(difficulty) ? difficulty : "beginner";

    const keywords = extractKeywords(text, safeDifficulty);
    const questions = await generateQuiz(keywords, type);

    const quiz = new Quiz({
      title,
      text,
      difficulty: safeDifficulty,
      type,
      keywords,
      questions,
      createdBy: req.user?.id ?? null
    });

    await quiz.save();
    res.status(201).json(quiz);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create quiz" });
  }
}

export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
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
    res.json({ message: "Quiz deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting quiz" });
  }
}
