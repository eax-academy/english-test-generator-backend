import Quiz from '../models/quiz.model.js';
import { generateQuiz } from '../utils/generator.js';

function extractKeywords(text, difficulty = "beginner") {
    const words = text
        .replace(/[^\w\s]/g, '')
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

export async function createQuiz(req, res) {
    try {
        const { title, text, difficulty = "beginner", type = "mixed" } = req.body;
        console.log('📝 Input:', { title, difficulty, type, textLength: text?.length });

        if (!text || !title) {
            return res.status(400).json({ message: "Both title and text input are required" });
        }

        // Validate difficulty
        const allowedDifficulties = ["beginner", "intermediate", "advanced"];
        const safeDifficulty = allowedDifficulties.includes(difficulty) ? difficulty : "beginner";
        if (!allowedDifficulties.includes(difficulty)) {
            console.warn(`⚠️ Invalid difficulty '${difficulty}' provided. Falling back to 'beginner'.`);
        }

        // Extract keywords
        const keywords = extractKeywords(text, safeDifficulty);
        console.log('🔑 Keywords extracted:', keywords);

        // Generate quiz asynchronously
        const questions = await generateQuiz(keywords, type);
        console.log('❓ Questions generated:', questions.length);

        const quiz = new Quiz({
            title,
            text,
            difficulty: safeDifficulty,
            type,
            questions,
            createdBy: req.user?.id ?? null
        });

        await quiz.save();
        console.log('✅ Quiz saved with ID:', quiz._id);

        res.status(201).json(quiz);

    } catch (err) {
        console.error('❌ Error in createQuiz:', err);
        res.status(500).json({ message: err.message });
    }
}
