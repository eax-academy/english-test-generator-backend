export async function translateToArmenian(word) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      word
    )}&langpair=en|hy`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.responseData?.translatedText ?? word;
  } catch {
    return word;
  }
}