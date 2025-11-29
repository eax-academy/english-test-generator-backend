import "dotenv/config";
import sqlite3 from "sqlite3";
import mongoose from "mongoose";
import fs from "fs";

const BATCH_SIZE = 500;
const SQLITE_FILE_PATH = process.env.SQLITE_FILE_PATH;
const MONGO_URI = process.env.MONGO_URI;

if (!SQLITE_FILE_PATH || !MONGO_URI) {
  console.error(
    "❌ Error: Please define SQLITE_FILE_PATH and MONGO_URI in .env"
  );
  process.exit(1);
}

if (!fs.existsSync(SQLITE_FILE_PATH)) {
  console.error(`❌ Error: SQLite file not found at: ${SQLITE_FILE_PATH}`);
  process.exit(1);
}

// Define Model INLINE (Fixes Buffering/Instance Issues)
const WordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    translation: { type: String, required: false },
    usage_count: { type: Number, required: false, default: 0 },
    level: { type: String, default: "Unknown" },
    definition: { type: String, required: false },
    partOfSpeech: { type: String, required: false },
  },
  { timestamps: true }
);

// Check if model exists to avoid overwrite error
const WordModel = mongoose.models.Word || mongoose.model("Word", WordSchema);

// --- Helpers ---
const normalizeLevel = (level) => {
  const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (!level) return "Unknown";
  const upperLevel = level.toString().trim().toUpperCase();
  return validLevels.includes(upperLevel) ? upperLevel : "Unknown";
};

const getSqliteData = (dbPath) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });
    db.all("SELECT * FROM vocab", [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// --- Main Migration ---
const migrate = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");

    mongoose.connection.on("connected", () =>
      console.log("🟢 Mongoose: Connected")
    );
    mongoose.connection.on("error", (err) =>
      console.error("🔴 Mongoose Error:", err)
    );

    mongoose.set("bufferCommands", false);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout faster if IP is blocked
      family: 4, // Forces IPv4 (Fixes localhost issues on Mac)
    });

    console.log(`⏳ Reading SQLite from: ${SQLITE_FILE_PATH}`);
    const sqliteRows = await getSqliteData(SQLITE_FILE_PATH);
    console.log(`✅ Found ${sqliteRows.length} rows in SQLite.`);

    if (sqliteRows.length === 0) return;

    console.log("⏳ Starting Batch Migration...");

    let processedCount = 0;

    for (let i = 0; i < sqliteRows.length; i += BATCH_SIZE) {
      const batch = sqliteRows.slice(i, i + BATCH_SIZE);

      const bulkOps = batch.map((row) => ({
        updateOne: {
          filter: { word: row.word },
          update: {
            $set: {
              word: row.word,
              definition: row.definition,
              level: normalizeLevel(row.level),
              partOfSpeech:
                row.partOfSpeech || row.part_of_speech || row.pos || null,
              translation: row.translation || null,
              usage_count: row.usage_count || 0,
            },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await WordModel.bulkWrite(bulkOps);
        processedCount += bulkOps.length;
        process.stdout.write(
          `\r🚀 Processed: ${processedCount} / ${sqliteRows.length} words...`
        );
      }
    }

    console.log("\n\n🎉 Migration Complete!");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:");
    console.error(error);

    if (error.name === "MongooseServerSelectionError") {
      console.log("\n💡 TIP: Check your IP Whitelist in MongoDB Atlas.");
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log("👋 Connection closed.");
    process.exit(0);
  }
};

migrate();
