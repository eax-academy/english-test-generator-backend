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

    // Optional: high-frequency word overrides for quizzes
    const commonWordOverrides = {
      republic: "A government in which the people elect representatives.",
      democratic: "Based on social equality and the principles of democracy.",
      union: "The act of joining together or a group of states forming one entity.",
      legislature: "A group of people who make laws.",
      state: "A territory with its own government.",
    };
    const lowerWord = word.toLowerCase();
    if (commonWordOverrides[lowerWord]) {
      return {
        definition: commonWordOverrides[lowerWord],
        pos: guessPos(word),
        example: "",
        isVerified: true,
        allDefinitions: defs,
      };
    }

    // Filter out rare, obsolete, or technical definitions
    defs = filterRareDefinitions(defs);
    if (!defs.length) return null;

    // Score and sort
    defs.forEach(d => (d.score = scoreDefinition(word, d.definition, d.pos)));
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

const COMMON_POS_BOOST = {
  noun: 2,
  verb: 2,
  adjective: 2,
  adverb: 1,
  preposition: 1,
};

// Filter out rare or technical definitions
function filterRareDefinitions(defs) {
  const rareFlags = [
    "archaic", "obsolete", "rare", "technical", "medicine", "biology",
    "physics", "finance", "computing", "law", "figurative", "metaphor",
    "idiomatic", "nautical", "military", "botany", "zoology"
  ];
  return defs.filter(d => !rareFlags.some(f => d.definition.toLowerCase().includes(f)));
}

// Score definitions for relevance and clarity
function scoreDefinition(word, definition, pos) {
  if (!definition) return 0;
  let score = 0;
  const lower = definition.toLowerCase();

  // Concise definitions preferred
  if (definition.length < 80) score += 3;
  else if (definition.length < 150) score += 2;
  else if (definition.length > 200) score -= 2;

  // Avoid circular definitions
  const base = word.toLowerCase().replace(/(ing|ed|es|s)$/i, "");
  if (new RegExp(`\\b${base}\\b`, "i").test(lower)) score -= 3;

  // Penalize single-word nouns
  if (definition.split(/\s+/).length === 1 && pos === "noun") score -= 2;

  // Reward common POS
  if (pos && COMMON_POS_BOOST[pos]) score += COMMON_POS_BOOST[pos];

  return score;
}
