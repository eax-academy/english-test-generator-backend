import express from "express";
import { analyzeTextController } from "../controllers/analyze.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, isAdmin, analyzeTextController);

export default router;
