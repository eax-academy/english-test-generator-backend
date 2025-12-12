import { createQuizService} from "../services/quiz.service.js";

import Quiz from "../models/quiz.model.js";
import TextSubmission from "../models/textSubmission.model.js";

// -------------------- Quiz Controllers --------------------
export async function createQuizController(req, res) {
  try {
    const { title, text, type, difficulty } = req.body;
    const userId = req.user?.id || "654321654321654321654321";  // TODO: return null

    const result = await createQuizService({ title, text, type, difficulty, userId });
    res.status(201).json(result);
  } catch (err) {
    console.error("Quiz creation error:", err);
    res.status(400).json({ message: err.message });
  }
}

export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "textSubmissionId",
        select: "raw_text"
      });

    const result = quizzes.map(q => ({
      ...q.toObject(),
      text: q.textSubmissionId ? q.textSubmissionId.raw_text : null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id).populate({
      path: "textSubmissionId",
      select: "raw_text" // only get the raw_text field
    });

    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    res.json({
      ...quiz.toObject(),
      text: quiz.textSubmissionId.raw_text
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.textSubmissionId) {
      await TextSubmission.findByIdAndDelete(quiz.textSubmissionId);
    }
    await Quiz.findByIdAndDelete(req.params.id);

    res.json({ message: "Quiz and linked TextSubmission deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
