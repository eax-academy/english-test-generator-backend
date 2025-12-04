export async function fetchDefinitionAndPos(word) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const entry = Array.isArray(data) && data.length ? data[0] : null;

    if (!entry || !entry.meanings?.length) {
      return { definition: "Definition unavailable", pos: "noun", example: null };
    }

    // Pick first meaning
    const meaning = entry.meanings[0];
    const definition = meaning.definitions?.[0]?.definition || "Definition unavailable";
    const pos = meaning.partOfSpeech || guessPos(word);
    const example = meaning.definitions?.[0]?.example || null;

    return { definition, pos, example };
  } catch {
    return { definition: "Definition unavailable", pos: guessPos(word), example: null };
  }
}

export function guessPos(word) {
  const w = word.toLowerCase();
  if (w.endsWith("ly")) return "adverb";
  if (/(ing|ize|ise|ate|fy|en)$/.test(w)) return "verb";
  if (/(ed|ive|ous|al|able|ic|y|ful|less)$/.test(w)) return "adjective";
  if (/^[A-Z]/.test(word)) return "proper";
  return "noun";
}
