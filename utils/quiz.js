import { translateToArmenian } from "../api/translateToArmenian.js";
import { fetchDefinitionAndPos } from "../api/fetchDefinition.js";
import Word from "../models/word.model.js";


export async function addWordsWithTranslationsAndDefinitions(words) {
    const normalizedWords = [...new Set(words.map(w => w.toLowerCase().trim()))];
    const existing = await Word.find({ word: { $in: normalizedWords } });
    const existingMap = new Map(existing.map(w => [w.word, w]));
    const toCreate = normalizedWords.filter(w => !existingMap.has(w));
    const newWordDocs = [];


    const createFetches = toCreate.map(async (word) => {
        const [translation, defData] = await Promise.all([
            translateToArmenian(word),
            fetchDefinitionAndPos(word),
        ]);
        const hasTranslation = translation && translation.trim() !== "";
        const hasDefinition = defData?.definition && defData.definition.trim() !== "";
        if (!hasTranslation && !hasDefinition) return null;
        return {
            word,
            lemma: word,
            level: defData?.level || "UNKNOWN",
            partOfSpeech: defData?.pos || "noun",
            translation: hasTranslation ? translation : null,
            definition: hasDefinition ? defData.definition : null,
        };
    });
    const newWordObjs = (await Promise.all(createFetches)).filter(Boolean);
    if (newWordObjs.length > 0) {
        const created = await Word.insertMany(newWordObjs, { ordered: false });
        newWordDocs.push(...created);
    }

    // Batch fetch for updates to existing words in parallel
    const updateFetches = normalizedWords.map(async (word) => {
        if (!existingMap.has(word)) return null;
        const dbWord = existingMap.get(word);
        let needsUpdate = false;
        let newTranslation = dbWord.translation;
        let newDefinition = dbWord.definition;
        const updatePromises = [];
        if (!dbWord.translation || dbWord.translation.trim() === "") {
            updatePromises.push(translateToArmenian(word));
        } else {
            updatePromises.push(Promise.resolve(dbWord.translation));
        }
        if (!dbWord.definition || dbWord.definition.trim() === "") {
            updatePromises.push(fetchDefinitionAndPos(word));
        } else {
            updatePromises.push(Promise.resolve({ definition: dbWord.definition }));
        }
        const [translation, defData] = await Promise.all(updatePromises);
        if ((!dbWord.translation || dbWord.translation.trim() === "") && translation && translation.trim() !== "") {
            newTranslation = translation;
            needsUpdate = true;
        }
        if ((!dbWord.definition || dbWord.definition.trim() === "") && defData?.definition && defData.definition.trim() !== "") {
            newDefinition = defData.definition;
            needsUpdate = true;
        }
        if (needsUpdate) {
            return Word.updateOne(
                { _id: dbWord._id },
                { $set: { translation: newTranslation, definition: newDefinition } }
            );
        }
        return null;
    });
    await Promise.all(updateFetches);

    return newWordDocs;
}

