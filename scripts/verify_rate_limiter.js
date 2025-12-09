
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api/v1';

async function testRateLimit() {
    console.log("🚀 Starting Rate Limit Test on /login");
    console.log("ℹ️  Limit should be 5 requests per 15 minutes");

    for (let i = 1; i <= 8; i++) {
        try {
            const start = Date.now();
            const res = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: `test${i}@example.com`, password: 'password123' })
            });
            const duration = Date.now() - start;

            if (res.status === 429) {
                console.log(`✅ Request ${i}: BLOCKED (429 Too Many Requests) - Rate Limit Working!`);
                console.log(`   Retry-After: ${res.headers.get('retry-after')}s`);
            } else {
                console.log(`👉 Request ${i}: Status ${res.status} (${duration}ms)`);
            }
        } catch (error) {
            if (error.cause && error.cause.code === 'ECONNREFUSED') {
                console.error(`❌ Request ${i} Failed: Connection Refused. Is the server running on port 8000?`);
            } else {
                console.error(`❌ Request ${i} Failed:`, error.message || error);
            }
        }
        // Small delay
        await new Promise(r => setTimeout(r, 200));
    }
}

testRateLimit();