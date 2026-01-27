import { handleTextSubmission } from "../services/analyze.service.js";
import { z } from 'zod';

const AnalyzeSchema = z.object({
  text: z.string()
    .min(1, "Text input is required")
    .trim(),
});

export const analyzeTextController = async (req, res) => {
  try {
    const { text } = AnalyzeSchema.parse(req.body);
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }
    console.log(`Admin ${userId} is initiating analysis...`);
    const result = await handleTextSubmission(text, userId);

    return res.status(201).json({
      success: true,
      message: "Text processed and saved successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("❌ Analyze Controller Error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Internal Server Error",
    });
  }
};
