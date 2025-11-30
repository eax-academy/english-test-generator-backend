import { handleTextSubmission } from "../services/analyze.service.js";
/**
 * Controller to handle the text analysis request.
 * Receives HTTP request -> Calls Service -> Sends HTTP response.
 */
export const analyzeTextController = async (req, res) => {
  try {
    const { text } = req.body;

    // test ID, req.user (JWT middleware)
    const userId = req.user?._id || "654321654321654321654321";

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text input is required and must be a string.",
      });
    }

    console.log("Controller: Processing analysis...");
    const result = await handleTextSubmission(text, userId);

    return res.status(201).json({
      success: true,
      message: "Text processed and saved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};
