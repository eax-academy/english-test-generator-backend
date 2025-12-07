
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api/quiz';

async function testApiLimit() {
    console.log("🚀 Starting Rate Limit Test on /api/quiz");
    console.log("ℹ️  Limit should be 50 requests per 1 hour");

    // We need to make 52 requests to exceed the limit of 50
    // We'll do it in batches to speed up
    const TOTAL_REQUESTS = 53;

    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
        try {
            const start = Date.now();
            // Just hit the list quizzes endpoint
            const res = await fetch(`${BASE_URL}/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const duration = Date.now() - start;

            if (res.status === 429) {
                console.log(`✅ Request ${i}: BLOCKED (429 Too Many Requests) - Rate Limit Working!`);
                console.log(`   Retry-After: ${res.headers.get('retry-after')}s`);
            } else if (i % 10 === 0 || i > 50) {
                // Log every 10th request or if near end
                console.log(`👉 Request ${i}: Status ${res.status} (${duration}ms)`);
            }
        } catch (error) {
            if (error.cause && error.cause.code === 'ECONNREFUSED') {
                console.error(`❌ Request ${i} Failed: Connection Refused. Is the server running?`);
            } else {
                console.error(`❌ Request ${i} Failed:`, error.message);
            }
        }
        // Very small delay to avoid overwhelming local network stack causing fetch errors
        await new Promise(r => setTimeout(r, 50));
    }
}

testApiLimit();
