
import redisClient from '../config/redis.js';

const resetLimits = async () => {
    try {
        console.log("🧹 Clearing Rate Limit keys from Redis...");

        // Get all rate limit keys (prefix is 'rl:')
        const keys = await redisClient.keys('rl:*');

        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`✅ Successfully deleted ${keys.length} rate limit keys.`);
            console.log("🔄 Counters are reset to 0. You can now run the test scripts again.");
        } else {
            console.log("ℹ️  No rate limit keys found to clear.");
        }

    } catch (error) {
        console.error("❌ Error clearing limits:", error);
    } finally {
        // We must manually disconnect because the import holds the connection open
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
        process.exit(0);
    }
};

resetLimits();
