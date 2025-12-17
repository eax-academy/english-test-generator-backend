import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/user.model.js';
import { getDashboardStats } from '../controllers/admin.controller.js';
import * as crypto from '../utils/crypto.js';
import dotenv from 'dotenv';
dotenv.config();

// Mock Express Req/Res
const mockReq = {};
const mockRes = {
    json: (data) => console.log("Response JSON:", data),
    status: (code) => {
        console.log("Response Status:", code);
        return { json: (data) => console.log("Error JSON:", data) };
    }
};

const run = async () => {
    try {
        await connectDB();
        console.log("Connected to DB");

        // 1. Check for Admin
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log("No admin found. Creating one...");
            const hashedPassword = await crypto.hashPassword("admin123");
            admin = await User.create({
                name: "Admin",
                surname: "User",
                email: "admin@example.com",
                password: hashedPassword,
                role: "admin"
            });
            console.log("Admin created: admin@example.com / admin123");
        } else {
            console.log("Admin exists:", admin.email);
        }

        // 2. Test Dashboard Stats Logic
        console.log("Testing getDashboardStats...");
        await getDashboardStats(mockReq, mockRes);

        await disconnectDB();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
