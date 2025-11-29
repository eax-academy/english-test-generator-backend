const fs = require("fs");
const config = require("../config");

class TextParser {
  parseFile() {
    // 1. Check if file exists
    if (!fs.existsSync(config.sourceFile)) {
      console.error(`❌ Error: File '${config.sourceFile}' not found.`);
      return [];
    }

    console.log(`📖 Reading ${config.sourceFile}...`);
    const text = fs.readFileSync(config.sourceFile, "utf8");

    // 2. Regex: Lowercase, find words (including apostrophes)
    const allWords = text.toLowerCase().match(/[a-z']+/g);

    if (!allWords) return [];

    // 3. Remove duplicates and small noise (one letter words except 'a' and 'i')
    const uniqueWords = new Set(allWords);
    const cleanList = Array.from(uniqueWords).filter(
      (w) => w.length > 1 || w === "a" || w === "i"
    );

    console.log(`   Found ${cleanList.length} unique words.`);
    return cleanList;
  }
}

module.exports = new TextParser();
