import { config } from "./env.js";

export const queueConfig = {
  connection: { 
    connection: config.redisUri || { host: "localhost", port: 6379 },
  },
  defaultJobOptions: {
    attempts: 5, 
    backoff: {
      type: "exponential",
      delay: 30000, 
    },
    removeOnComplete: true, 
    removeOnFailed: {
      age: 24 * 3600 
    }
  }
};