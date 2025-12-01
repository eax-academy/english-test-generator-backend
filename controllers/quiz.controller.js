import { createQuizService} from "../services/quiz.service.js";

// --- Create a new quiz ---
export async function createQuizController(req, res) {
  try {
    const { title, text, type, difficulty } = req.body;
    const userId = req.user?.id || null;

    const result = await createQuizService({ title, text, type, difficulty, userId });
    res.status(201).json(result);
  } catch (err) {
    console.error("Quiz creation error:", err);
    res.status(400).json({ message: err.message });
  }
}


