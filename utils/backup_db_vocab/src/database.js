const sqlite3 = require("sqlite3").verbose();
const config = require("../config");

class Database {
  constructor() {
    this.db = new sqlite3.Database(config.dbFile);
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
                CREATE TABLE IF NOT EXISTS vocab (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    word TEXT UNIQUE,
                    level TEXT,
                    definition TEXT,
                    partOfSpeech TEXT
                )
            `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Save initial words list (Insert Only if not exists)
  importPendingWords(wordList) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
        const stmt = this.db.prepare(
          "INSERT OR IGNORE INTO vocab (word, level) VALUES (?, 'pending')"
        );

        wordList.forEach((word) => stmt.run(word));

        stmt.finalize();
        this.db.run("COMMIT", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Get 10 words that are still 'pending'
  getPendingBatch() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT word FROM vocab WHERE level = 'pending' LIMIT ?",
        [config.batchSize],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Update word with API results
  updateWord(word, level, definition, partOfSpeech) {
    const stmt = this.db.prepare(
      "UPDATE vocab SET level = ?, definition = ?, partOfSpeech = ? WHERE word = ?"
    );
    stmt.run(level, definition, partOfSpeech, word);
    stmt.finalize();
  }

  close() {
    this.db.close();
  }
}

module.exports = new Database();
