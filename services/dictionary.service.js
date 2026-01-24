import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export const fetchWordUpdates = async (word) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", 
      generationConfig: { response_mime_type: "application/json" }, 
    });

    const prompt = `Analyze the English word "${word}". Return a JSON object:
    {
      "level": "CEFR level (A1-C2)",
      "translation": "Armenian translation",
      "definition": "Simple English definition",
      "partOfSpeech": "noun/verb/adjective/adverb"
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // No need for regex cleaning because of generationConfig: "application/json"
    const data = JSON.parse(text);

    return {
      level: data.level || "Unknown",
      translation: data.translation || "Unknown",
      definition: data.definition || "",
      partOfSpeech: data.partOfSpeech || "other",
    };
  } catch (error) {
    // Detect 429 (Too Many Requests)
    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("quota")
    ) {
      const rateLimitError = new Error("GEMINI_RATE_LIMIT");
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    console.error(`⚠️ Gemini Error for "${word}":`, error.message);
    return null;
  }
};
