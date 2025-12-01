const config = require('./config');
const db = require('./src/database');
const api = require('./src/api');
const parser = require('./src/parser');
const { sleep } = require('./src/utils');

async function main() {
    console.log("🚀 Starting Analyzer (SQLite Engine)...");

    if (!config.rapidApiKey) {
        console.error("⛔ Error: RAPIDAPI_KEY is missing in .env");
        process.exit(1);
    }

    try {
        
        await db.init();

        const words = parser.parseFile();
        if (words.length > 0) {
            await db.importPendingWords(words);
            console.log("✅ Phase 1: Text Imported to DB.");
        }

        console.log("\n--- Phase 2: Enriching Data via API ---");
        
        let remaining = true;
        while(remaining) {
            // Get batch from DB (SELECT * FROM vocab WHERE level='pending'...)
            const batch = await db.getPendingBatch();
            
            if (batch.length === 0) {
                console.log("🎉 All words processed!");
                remaining = false;
                break;
            }

            console.log(`Processing batch of ${batch.length}...`);

            for (const row of batch) {
                // Fetch from API
                const result = await api.fetchDetails(row.word);

                if (result.success) {
                    const level = api.calculateLevel(result.zipf);
                    
                    await db.updateWord(row.word, level, result.def, result.pos);
                    console.log(`   ✅ ${row.word} -> [${level}]`);
                } 
                else if (result.status === 404) {
                    // Mark as Not Found in SQLite
                    await db.updateWord(row.word, 'Not Found', null, null);
                    console.log(`   ⚪ ${row.word} (Not in API)`);
                }
                else {
                    // If API failed (500 or max retries), we do NOT update the DB.
                    // This keeps the level as 'pending' so it tries again next time.
                    console.log(`   ❌ Failed: ${row.word} (Skipping for now)`);
                }

                // Friendly delay (Uses the 2000ms from config)
                await sleep(config.requestDelayMs);
            }
        }

    } catch (err) {
        console.error("Critical Error:", err);
    } finally {
        db.close();
    }
}

main();