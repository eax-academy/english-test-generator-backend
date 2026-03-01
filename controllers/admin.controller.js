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
            .populate('userId', 'email name')
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
        const { quizId, score, elapsedTime, totalQuestions, userId, email } = req.body;

        if (!quizId || score === undefined || !userId || !email) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await Result.create({
            quizId,
            score,
            elapsedTime,
            totalQuestions,
            userId,
            email,
            completedAt: new Date(),
        });

        res.status(201).json(result);
    } catch (err) {
        console.error("Create result error:", err);
        res.status(500).json({ message: "Failed to save result" });
    }
};


export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    const systemAdmins = process.env.ADMIN_EMAILS.split(",").map((e) =>
      e.trim(),
    );

    if (systemAdmins.includes(userToDelete.email)) {
      return res.status(403).json({
        message: "This is a System Admin and cannot be deleted.",
      });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

