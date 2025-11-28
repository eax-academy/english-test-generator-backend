import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const PORT = 5001; // Ensure this matches your running server port
const BASE_URL = `http://localhost:${PORT}/api/v1`;

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// --- Helpers ---
const generateToken = () => {
    const payload = {
        id: '507f1f77bcf86cd799439011', // Dummy ID
        role: 'admin',
        email: 'admin@test.com'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

const runTest = async (name, fn) => {
    process.stdout.write(`Testing ${name}... `);
    try {
        await fn();
        console.log('✅ PASS');
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`   -> ${err.message}`);
    }
};

const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText} - ${data.message || JSON.stringify(data)}`);
    }
    return data;
};

// --- Main ---
async function main() {
    console.log(`🚀 Starting API Tests against ${BASE_URL}\n`);

    const token = generateToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 1. Test Admin Logs
    await runTest('GET /logs', async () => {
        const logs = await fetchJson(`${BASE_URL}/logs`, { headers });
        if (!Array.isArray(logs)) throw new Error('Response is not an array');
    });

    // 2. Test Words
    let createdWordId;
    await runTest('POST /words', async () => {
        const body = {
            word: `TestWord_${Date.now()}`,
            translation: 'Prueba',
            language: 'en',
            lemma: 'test',
            pos: 'noun'
        };
        const res = await fetchJson(`${BASE_URL}/words`, { method: 'POST', headers, body: JSON.stringify(body) });
        createdWordId = res._id;
    });

    await runTest('GET /words', async () => {
        const words = await fetchJson(`${BASE_URL}/words`, { headers });
        if (!Array.isArray(words)) throw new Error('Response is not an array');
        if (createdWordId && !words.find(w => w._id === createdWordId)) throw new Error('Created word not found in list');
    });

    if (createdWordId) {
        await runTest('DELETE /words/:id', async () => {
            await fetchJson(`${BASE_URL}/words/${createdWordId}`, { method: 'DELETE', headers });
        });
    }

    // 3. Test Tests (Admin View)
    await runTest('GET /admin/tests', async () => {
        const tests = await fetchJson(`${BASE_URL}/admin/tests`, { headers });
        if (!Array.isArray(tests)) throw new Error('Response is not an array');
    });

    // 4. Test Tests (User View & Actions)
    // We need a REAL user for this to work properly with /users/me
    let userToken;
    let userId;
    const testEmail = `user_${Date.now()}@test.com`;
    const testPassword = 'password123';

    await runTest('POST /register', async () => {
        await fetchJson(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', surname: 'User', email: testEmail, password: testPassword })
        });
    });

    await runTest('POST /login', async () => {
        const res = await fetchJson(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        userToken = res.token;
        if (!userToken) throw new Error('No token returned');
    });

    const userHeaders = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };

    // GET /tests (User)
    await runTest('GET /tests (User)', async () => {
        const tests = await fetchJson(`${BASE_URL}/tests`, { headers: userHeaders });
        if (!Array.isArray(tests)) throw new Error('Response is not an array');
    });

    // POST /tests/generate/:submission_id (Expect 404 for fake ID, but confirms route exists)
    await runTest('POST /tests/generate (Route Check)', async () => {
        try {
            await fetchJson(`${BASE_URL}/tests/generate/507f1f77bcf86cd799439011`, { method: 'POST', headers: userHeaders });
        } catch (err) {
            if (!err.message.includes('404') && !err.message.includes('Submission not found')) {
                throw err;
            }
        }
    });

    // GET /tests/:id (Expect 404)
    await runTest('GET /tests/:id (Route Check)', async () => {
        try {
            await fetchJson(`${BASE_URL}/tests/507f1f77bcf86cd799439011`, { headers: userHeaders });
        } catch (err) {
            if (!err.message.includes('404')) throw err;
        }
    });

    // 5. Test User Management
    // GET /users/me
    await runTest('GET /users/me', async () => {
        const me = await fetchJson(`${BASE_URL}/users/me`, { headers: userHeaders });
        if (me.email !== testEmail) throw new Error('Email mismatch');
        userId = me._id;
    });

    // PUT /users/me
    await runTest('PUT /users/me', async () => {
        const updated = await fetchJson(`${BASE_URL}/users/me`, {
            method: 'PUT',
            headers: userHeaders,
            body: JSON.stringify({ name: 'UpdatedName' })
        });
        if (updated.name !== 'UpdatedName') throw new Error('Name update failed');
    });

    // GET /users (Admin)
    await runTest('GET /users (Admin)', async () => {
        const users = await fetchJson(`${BASE_URL}/users`, { headers }); // Admin token
        if (!Array.isArray(users)) throw new Error('Response is not an array');
        if (!users.find(u => u.email === testEmail)) throw new Error('New user not found in admin list');
    });

    // DELETE /users/me (Cleanup)
    await runTest('DELETE /users/me', async () => {
        await fetchJson(`${BASE_URL}/users/me`, { method: 'DELETE', headers: userHeaders });
    });

    // Verify deletion
    await runTest('GET /users/me (Verify Deletion)', async () => {
        try {
            await fetchJson(`${BASE_URL}/users/me`, { headers: userHeaders });
            throw new Error('User should be deleted but request succeeded');
        } catch (err) {
            if (!err.message.includes('404') && !err.message.includes('User not found')) throw err;
        }
    });

    console.log('\n✨ Tests Completed');
}

main().catch(console.error);
