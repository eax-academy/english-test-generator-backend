export async function fetchDefinitionAndPos(word) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      word
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    const entry = Array.isArray(data) && data.length ? data[0] : null;
    const meaning = entry?.meanings?.[0];
    const def =
      meaning?.definitions?.[0]?.definition || "Definition unavailable";
    const pos = meaning?.partOfSpeech || "noun";
    return { definition: def, pos };
  } catch {
    return { definition: "Definition unavailable", pos: "noun" };
  }
}