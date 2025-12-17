import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/user.model.js';
import Quiz from '../models/quiz.model.js';
import Result from '../models/result.model.js';
import { getDashboardStats, getAllResults } from '../controllers/admin.controller.js';
import dotenv from 'dotenv';
dotenv.config();

// Mock Express
const mockReq = {};
const mockRes = {
    json: (data) => console.log("Response JSON:", JSON.stringify(data, null, 2)),
    status: (code) => {
        console.log("Response Status:", code);
        return { json: (data) => console.log("Error JSON:", data) };
    }
};

const run = async () => {
    try {
        await connectDB();
        console.log("✅ DB Connected");

        // 1. Ensure User & Quiz exist
        const user = await User.findOne();
        const quiz = await Quiz.findOne();

        if (!user || !quiz) {
            console.log("⚠️ Need at least 1 user and 1 quiz to test results.");
            process.exit(0);
        }

        // 2. Create Dummy Result
        console.log("Creating dummy result...");
        await Result.create({
            userId: user._id,
            quizId: quiz._id,
            score: 85,
            totalQuestions: 10
        });

        // 3. Test Dashboard Stats (should include results count)
        console.log("--- Testing Dashboard Stats ---");
        await getDashboardStats(mockReq, mockRes);

        // 4. Test Get All Results (should include populated data)
        console.log("--- Testing Get All Results ---");
        await getAllResults(mockReq, mockRes);

        await disconnectDB();
        console.log("👋 Done");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
