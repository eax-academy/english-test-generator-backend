import { config } from "./env.js";

export const queueConfig = {
  connection: { 
    url: config.redisUri || "redis://localhost:6379" 
  },
  defaultJobOptions: {
    attempts: 5, 
    backoff: {
      type: "exponential",
      delay: 30000, 
    },
    removeOnComplete: true, 
  }
};