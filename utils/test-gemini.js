import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env.js"; 

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function diagnostic() {
  try {
    console.log("🔍 Testing Gemini API connection...");
    console.log(`📡 Using Key: ${config.geminiApiKey.substring(0, 5)}***`);
    console.log(`🌍 Environment: ${config.env}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`
    );

    const data = await response.json();

    if (data.error) {
      console.error("❌ API Error:", data.error.message);
      return;
    }

    console.log("✅ Connection Successful!");
    console.log("Models found:");
    data.models.slice(0, 3).forEach((m) => {
      console.log(` - ${m.name.replace("models/", "")}`);
    });
    
  } catch (err) {
    console.error("❌ Network or Import Error:", err.message);
  }
}

diagnostic();