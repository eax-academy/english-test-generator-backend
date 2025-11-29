const axios = require("axios");
const config = require("../config");
const { sleep } = require("./utils");

const apiClient = axios.create({
  baseURL: "https://wordsapiv1.p.rapidapi.com",
  headers: {
    "x-rapidapi-key": config.rapidApiKey,
    "x-rapidapi-host": config.rapidApiHost,
  },
});

const WordsApi = {
  calculateLevel(zipf) {
    if (!zipf) return "Unknown";
    if (zipf > 6.0) return "A1";
    if (zipf > 5.0) return "A2";
    if (zipf > 4.0) return "B1";
    if (zipf > 3.5) return "B2";
    if (zipf > 3.0) return "C1";
    return "C2";
  },

  async fetchDetails(word, retryCount = 0) {
    try {
      const response = await apiClient.get(`/words/${word}`);
      const data = response.data;

      let def = "No definition";
      let pos = "unknown";
      let zipf = 0;

      if (data.frequency) zipf = data.frequency;
      if (data.results && data.results.length > 0) {
        def = data.results[0].definition;
        pos = data.results[0].partOfSpeech;
      }

      return { success: true, zipf, def, pos };
    } catch (error) {
      // --- DEBUG LOGGING (Add these lines) ---
      const status = error.response ? error.response.status : "No Response";
      console.log(`   ⚠️  API Error on '${word}': Status ${status}`);
      // ---------------------------------------

      // HANDLE 429 (RATE LIMIT)
      if (error.response && error.response.status === 429) {
        if (retryCount >= config.retryLimit)
          return { success: false, status: 429 };

        const waitTime = 2000 * Math.pow(2, retryCount);
        console.log(`   ⏳ Rate limit hit. Retrying in ${waitTime / 1000}s...`);
        await sleep(waitTime);
        return this.fetchDetails(word, retryCount + 1);
      }

      // HANDLE 404 (Not Found)
      if (error.response && error.response.status === 404) {
        return { success: false, status: 404 };
      }

      // HANDLE 401/403 (Auth/Quota Issues) - STOP THE SCRIPT
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        console.log("   ⛔ CRITICAL: Check your API Key or Daily Quota.");
        process.exit(1); // Stop the app immediately
      }

      return { success: false, status: 500 };
    }
  },
};

module.exports = WordsApi;
