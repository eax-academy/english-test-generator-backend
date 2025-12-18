export async function translateToArmenian(word) {
  try {
    if (!word || typeof word !== "string" || !word.trim()) return null;

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|hy`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Translation API error");

    const data = await res.json();
    let translated = data?.responseData?.translatedText?.trim() || "";

    const armenianRegex = /^[\u0531-\u058F\u055A-\u055F0-9\s.,!?()«»\-]+$/;

    if (
      !translated ||
      translated.toLowerCase() === word.toLowerCase() ||
      !armenianRegex.test(translated) ||
      translated.length < 2 ||
      /translation|not available|unavailable|no translation/i.test(translated)
    ) {
      return null;
    }

    return translated;
  } catch (err) {
    console.error("Translation error:", word, err);
    return null;
  }
}
