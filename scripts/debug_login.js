
const login = async () => {
    try {
        console.log("Attempting login to http://localhost:5001/api/v1/auth/login...");
        const response = await fetch('http://localhost:5001/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });

        console.log("Status:", response.status);
        const data = await response.text();
        console.log("Response Body:", data);

        if (response.status === 403) {
            console.log("⚠️ Received 403. This confirms server-side rejection.");
        } else if (response.status === 200) {
            console.log("✅ Login Successful!");
        } else {
            console.log("ℹ️ Other status code received.");
        }

    } catch (e) {
        console.error("Fetch error:", e);
    }
};

login();
