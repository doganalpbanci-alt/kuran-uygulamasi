import data from "../data/surahs.json";

export const RECITERS = data.reciters;
export const DEFAULT_RECITER_ID = data.default_reciter_id;

export function getReciter(id) {
  return (
    RECITERS.find((r) => r.id === id) ??
    RECITERS.find((r) => r.id === DEFAULT_RECITER_ID) ??
    RECITERS[0]
  );
}

export function reciterLabel(reciter) {
  return reciter.style ? `${reciter.name} — ${reciter.style}` : reciter.name;
}

const pad3 = (n) => String(n).padStart(3, "0");

/**
 * Ayetin ses adresi. Adresler formülsel olduğu için veride tutulmuyor:
 * kari öneki + <sure3><ayet3>.mp3
 *
 * 0 numaralı ayet besmeledir ve Fatiha 1:1 kaydından gelir.
 */
export function verseAudioUrl(reciter, surahId, verseNumber) {
  const key = verseNumber === 0 ? "001001" : pad3(surahId) + pad3(verseNumber);
  return `${reciter.audio_base}${key}.mp3`;
}

/**
 * Ayetin kelimelerini seçili karinin zaman damgalarıyla birleştirir.
 * Kaynakta zaman damgası olmayan kelimeler -1 taşır; bunları null'a
 * çevirip imlecin atlamasını sağlıyoruz.
 */
export function getTimedWords(verse, reciterId) {
  const words = verse.arabic_words ?? [];
  const flat = verse.timings?.[reciterId];

  return words.map((text, i) => {
    const start = flat?.[i * 2];
    const end = flat?.[i * 2 + 1];
    const hasTiming = start != null && start >= 0 && end >= 0;
    return {
      text,
      start: hasTiming ? start : null,
      end: hasTiming ? end : null,
    };
  });
}
