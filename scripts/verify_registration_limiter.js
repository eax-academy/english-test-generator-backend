
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api/v1';

async function testRegistrationLimit() {
    console.log("🚀 Starting Rate Limit Test on /register");
    console.log("ℹ️  Limit should be 5 requests per 24 hours per IP");

    for (let i = 1; i <= 7; i++) {
        try {
            // Use random email to avoid collision errors, though limit applies regardless
            const email = `reg_test_${Date.now()}_${i}@example.com`;

            const start = Date.now();
            const res = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test',
                    surname: 'User',
                    email: email,
                    password: 'password123'
                })
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
                console.error(`❌ Request ${i} Failed: Connection Refused. Is the server running?`);
            } else {
                console.error(`❌ Request ${i} Failed:`, error.message);
            }
        }
        // Small delay
        await new Promise(r => setTimeout(r, 200));
    }
}

testRegistrationLimit();