require("dotenv").config();

module.exports = {
  rapidApiKey: process.env.RAPIDAPI_KEY,
  rapidApiHost: "wordsapiv1.p.rapidapi.com",

  // DATABASE & FILES
  dbFile: "words_collection.db",
  sourceFile: "source_text.txt", //words2.txt words.txt

  // TUNING
  batchSize: 10,
  retryLimit: 3,

  // SLOW DOWN: 2000ms (2 seconds) prevents "Rate Limit" errors
  requestDelayMs: 10000,
};
