import Quiz from '../models/quiz.model.js';

// --- Utility: keyword extraction (basic frequency approach) ---
function extractKeywords(text, difficulty) {
  const words = text
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  const freq = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));

  const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  let count = 5;
  if (difficulty === 'intermediate') count = 8;
  if (difficulty === 'advanced') count = 12;

  return sorted.slice(0, count);
}

// --- Utility: generate sample quiz ---
function generateQuizFromKeywords(keywords) {
  return keywords.map((word, i) => {
    if (i % 3 === 0) {
      return {
        type: 'fill',
        question: `Fill in the blank: "____" (${word.length} letters)`,
        answer: word
      };
    } else if (i % 3 === 1) {
      return {
        type: 'translation',
        question: `Translate "${word}" into Armenian`,
        answer: '(translation)'
      };
    } else {
      return {
        type: 'definition',
        question: `What does "${word}" mean?`,
        options: ['Definition 1', 'Definition 2', 'Definition 3'],
        answer: 'Definition 1'
      };
    }
  });
}

// --- Generate a quiz from text ---
export async function createQuiz(req, res) {
  try {
    const { title, text, difficulty } = req.body;
    const keywords = extractKeywords(text, difficulty);
    const questions = generateQuizFromKeywords(keywords);

    const quiz = new Quiz({
      title,
      text,
      difficulty,
      questions,
      createdBy: req.user?.id || null
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
