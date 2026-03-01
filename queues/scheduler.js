import { Queue } from "bullmq";
import WordModel from "../models/word.model.js";
import { queueConfig } from "../config/queue.js";
import { config } from "../config/env.js";

export const wordQueue = new Queue("word-updates", queueConfig);

export const scheduleDatabaseCheck = async () => {
  if (!config.geminiApiKey) {
    console.warn("⚠️ Scheduler skipped: GEMINI_API_KEY is not configured.");
    return;
  }

  try {
    const wordsToUpdate = await WordModel.find({
      $or: [
        { level: { $in: ["Unknown", "UNKNOWN", null] } },
        { translation: { $exists: false } },
        { translation: "" },
        { definition: { $exists: false } },
        { definition: "" },
      ],
    }).limit(100); 

    if (wordsToUpdate.length === 0) {
      console.log("Check: No words need updating.");
      return;
    }

    const jobs = wordsToUpdate.map((word) => ({
      name: "update-single-word",
      data: { wordId: word._id, wordText: word.word },
      opts: {
        jobId: `update-${word._id}-${Date.now()}`, 
        removeOnComplete: true, 
        removeOnFailed: { age: 24 * 3600 } 
      }
    }));

    await wordQueue.addBulk(jobs);

    console.log(`📅 Scheduled ${wordsToUpdate.length} words for update.`);
  } catch (error) {
    console.error("❌ Scheduler Error:", error);
  }
};

export const closeQueue = async () => {
  await wordQueue.close();
};