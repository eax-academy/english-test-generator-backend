export async function fetchDefinitionAndPos(word) {
  if (!word || typeof word !== "string" || !word.trim()) return null;

  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    let defs = [];

    for (const entry of data) {
      if (!entry.meanings) continue;
      for (const meaning of entry.meanings) {
        if (!meaning.definitions) continue;
        for (const def of meaning.definitions) {
          if (def.definition) {
            defs.push({
              definition: def.definition.trim(),
              pos: meaning.partOfSpeech || guessPos(word),
              example: def.example?.trim() || "",
            });
          }
        }
      }
    }

    if (!defs.length) return null;

    defs.forEach(d => d.score = scoreDefinition(word, d.definition));
    defs.sort((a, b) => b.score - a.score);

    return {
      ...defs[0],
      isVerified: true,
      allDefinitions: defs,
    };
  } catch (err) {
    console.warn("Definition fetch error:", word, err);
    return null;
  }
}

export function guessPos(word) {
  if (!word) return "noun";
  const w = word.toLowerCase();
  if (w.endsWith("ly")) return "adverb";
  if (/(ing|ize|ise|ate|fy|en|es|s)$/.test(w)) return "verb";
  if (/(ed|ive|ous|al|able|ic|y|ful|less|est|er)$/.test(w)) return "adjective";
  if (/^[A-Z]/.test(word)) return "proper";
  return "noun";
}

function scoreDefinition(word, definition) {
  if (!definition) return 0;

  let score = 0;
  const lower = definition.toLowerCase();

  // Shorter defs usually better
  if (definition.length < 80) score += 3;
  else if (definition.length < 120) score += 2;
  else score += 1;

  // Penalize if definition uses the word itself
  const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "i");
  if (regex.test(lower)) score -= 4;

  // Penalize rare or domain-specific defs
  const rareWords = [
    "archaic", "obsolete", "rare", "medicine", "biology",
    "physics", "chemistry", "finance", "computing", "law"
  ];
  if (rareWords.some(rw => lower.includes(rw))) score -= 3;

  if (lower.match(/\b(common|basic|simple|usual|main|often|usually)\b/)) score += 2;

  return score;
}

