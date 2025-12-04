export async function translateToArmenian(word) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      word
    )}&langpair=en|hy`;
    const res = await fetch(url);
    const data = await res.json();

    let translated = data?.responseData?.translatedText?.trim();

    const armenianRegex = /^[\u0531-\u058F\s.,!?()]+$/;

    if (!translated || translated.toLowerCase() === word.toLowerCase() || !armenianRegex.test(translated)) {
      console.warn(`⚠ Invalid translation for "${word}":`, translated);
      return word; 
    }

    return translated;
  } catch (err) {
    console.error("Translation error:", err);
    return word;
  }
}
