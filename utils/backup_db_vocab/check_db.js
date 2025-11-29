import sqlite3 from "sqlite3";

// CHANGE THIS TO YOUR EXACT FILE NAME
const DB_PATH = "./words_collection_copy.db";

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

console.log(`Checking database: ${DB_PATH}`);

db.serialize(() => {
  db.all(
    "SELECT name FROM sqlite_master WHERE type='table'",
    [],
    (err, tables) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        "Tables found:",
        tables.map((t) => t.name)
      );

      // 2. Count rows in every table found
      tables.forEach((table) => {
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
          if (err) console.error(err);
          else console.log(`Table '${table.name}' has ${row.count} entries.`);
        });
      });
    }
  );
});
