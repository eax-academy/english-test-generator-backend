import { createClient } from "redis";
import { config } from "./env.js";

const redisClient = createClient({
    url: config.redisUri || "redis://localhost:6379",
    socket: {
        reconnectStrategy: (retries) => {
            // Exponential backoff: 100ms, 200ms, 400ms, ... max 3000ms
            const delay = Math.min(retries * 100, 3000);
            console.log(`Redis reconnect attempt ${retries}, waiting ${delay}ms`); // auto-reconnect
            return delay;
        },
        connectTimeout: 10000, // 10 seconds
    },
    // Optional: Add password if needed
    // password: process.env.REDIS_PASSWORD,
});

//logs
redisClient.on("connect", () => console.log("Redis Connecting..."));
redisClient.on("ready", () => console.log("Redis Connected & Ready"));
redisClient.on("error", (err) => console.error("Redis Error:", err.message));
redisClient.on("reconnecting", () => console.log("Redis Reconnecting..."));
redisClient.on("end", () => { console.log("Redis: Connection closed") });
/**
 * Connect to Redis
 * */
export const connectRedis = async () => {
    try {
        // setupRedisListeners(); // Function not defined, listeners are already attached above
        if (!redisClient.isOpen) {
            await redisClient.connect();
        } else {
            // console.log("Redis: Already connected");
        }
    } catch (error) {
        console.error(":x: Redis Connection Failed:", error.message);
        console.error("Make sure Redis server is running on", config.redisUri || "redis://localhost:6379");
        process.exit(1); // Stop server if Redis fails (same as MongoDB)
    }
};
/**
 * Gracefully disconnect from Redis
 * Call this during server shutdown
 */
export const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit(); // Graceful shutdown
            console.log(":wave: Redis: Disconnected gracefully");
        }
    } catch (error) {
        console.error(":x: Redis Disconnect Error:", error.message);
        await redisClient.disconnect(); // Force disconnect
    }
};
/** * Check if Redis is connected
 */
export const isRedisConnected = () => {
    return redisClient.isOpen && redisClient.isReady;
};
/**
 * Get Redis client info (for debugging)
 */
export const getRedisInfo = async () => {
    try {
        if (!isRedisConnected()) {
            return { connected: false };
        }
        const info = await redisClient.info();
        const dbSize = await redisClient.dbSize();
        return {
            connected: true,
            dbSize,
            info: info.split('\n').slice(0, 10).join('\n'), // First 10 lines
        };
    } catch (error) {
        return { connected: false, error: error.message };
    }
};
// Initial connection using Top-Level Await to ensure client is ready for dependent modules
try {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
} catch (err) {
    console.error(":x: Redis Top-Level Connect Error:", err.message);
}

export default redisClient; 