import { Worker } from "bullmq";
import WordModel from "../models/word.model.js";
import { fetchWordUpdates } from "../services/dictionary.service.js";
import { queueConfig } from "../config/queue.js";

let worker;

export const startWordWorker = () => {
  worker = new Worker(
    "word-updates",
    async (job) => {
      const { wordId, wordText } = job.data;

      try {
        const wordDoc = await WordModel.findById(wordId);
        if (!wordDoc) return;

        const updates = await fetchWordUpdates(wordText);

        if (updates) {
          await WordModel.findByIdAndUpdate(wordId, {
            $set: {
              level: updates.level,
              translation: updates.translation,
              definition: updates.definition,
              partOfSpeech: updates.partOfSpeech,
            },
          });
        }
      } catch (err) {
        if (err.message === "MISSING_API_KEY" || err.isCritical) {
          console.error(
            "🛑 STOPPING WORKER: Gemini API Key is missing or invalid.",
          );
          await stopWordWorker();
          return;
        }
        if (err.message === "GEMINI_RATE_LIMIT") {
          console.log("🛑 Rate limit hit. Pausing worker for 60s...");
          await worker.rateLimit(60000);
          throw err;
        }
        throw err;
      }
    },
    {
      connection: queueConfig.connection,
      concurrency: 5,
      limiter: {
        max: 15,
        duration: 60000,
      },
    },
  );

  worker.on("failed", (job, err) => {
    if (err.message !== "MISSING_API_KEY") {
      console.log(`❌ Failed: ${job.data.wordText} -> ${err.message}`);
    }
  });
  worker.on("completed", (job) =>
    console.log(`✅ Completed: ${job.data.wordText}`),
  );
};

export const stopWordWorker = async () => {
  if (worker) {
    await worker.close();
    console.log("Worker stopped safely.");
  }
};
