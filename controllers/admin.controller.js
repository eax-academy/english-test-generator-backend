import Test from '../models/test.model.js';
import User from '../models/user.model.js';
import Quiz from '../models/quiz.model.js';
import Result from '../models/result.model.js';

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalQuizzes = await Quiz.countDocuments();
        const totalTests = await Test.countDocuments();
        const totalResults = await Result.countDocuments();

        res.json({
            users: totalUsers,
            quizzes: totalQuizzes,
            tests: totalTests,
            results: totalResults
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllResults = async (req, res) => {
    try {
        const results = await Result.find()
            .populate('userId', 'name email')
            .populate('quizId', 'title')
            .sort({ completedAt: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllTests = async (req, res) => {
    try {
        const tests = await Test.find().sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const saveResult = async (req, res) => {
  try {
    const {
      quizId,
      score,
      elapsedTime,
      totalQuestions,
      userId,
    } = req.body;

    if (!quizId || score === undefined || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await Result.create({
      quizId,
      score,
      elapsedTime,
      totalQuestions,
      userId, 
      completedAt: new Date(),
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Create result error:", err);
    res.status(500).json({ message: "Failed to save result" });
  }
};

