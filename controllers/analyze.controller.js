import { processTextAnalysis } from "../services/analyze.service.js";

/**
 * Controller to handle the text analysis request.
 * Receives HTTP request -> Calls Service -> Sends HTTP response.
 */
export const analyzeTextController = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text input is required and must be a string.",
      });
    }

    console.log("Controller: Processing analysis...");
    const analyzedData = await processTextAnalysis(text);

    return res.status(200).json({
      success: true,
      data: analyzedData,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};
