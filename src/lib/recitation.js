import data from "../data/surahs.json";
import { EXTRA_RECITERS } from "./extraReciters";

// Quran.com karileri veriyle birlikte gelir (zaman damgaları onlarda),
// zaman damgası olmayanlar koddan eklenir — bkz. extraReciters.js
export const RECITERS = [
  ...data.reciters.filter((r) => (r.sync ?? "word") === "word"),
  ...EXTRA_RECITERS,
];
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
 *
 * continuous=true ise sürekli (tek dosya) tilavetin mutlak zamanları
 * kullanılır; aksi halde ayet dosyasına göreli olanlar.
 */
export function getTimedWords(verse, reciterId, { continuous = false } = {}) {
  const words = verse.arabic_words ?? [];
  const flat = continuous
    ? decodeContinuous(verse.ctimings?.[reciterId])?.slice(2)
    : verse.timings?.[reciterId];

  return words.map((text, i) => {
    const start = flat?.[i * 2];
    const end = flat?.[i * 2 + 1];
    // Sürekli modda eksik kelimeler sıfır uzunlukta gelir (start === end).
    const hasTiming =
      start != null && end != null && start >= 0 && end > start;
    return {
      text,
      start: hasTiming ? start : null,
      end: hasTiming ? end : null,
    };
  });
}

/**
 * Sürekli tilavet zamanlarını çözer. Veri, ayet başına göreli ardışık
 * farklar olarak saklanıyor (bkz. scripts/fetch-surahs.mjs).
 * Dönen dizi: [ayetBaşı, ayetSonu, k1Başı, k1Sonu, k2Başı, ...] — mutlak ms.
 */
export function decodeContinuous(encoded) {
  if (!encoded?.length) return null;
  const from = encoded[0];
  const out = [from, from + encoded[1]];
  let prev = 0;
  for (let i = 2; i < encoded.length; i++) {
    prev += encoded[i];
    out.push(from + prev);
  }
  return out;
}

/** Sürekli tilavette ayetin [başlangıç, bitiş] milisaniyesi. */
export function verseSpan(verse, reciterId) {
  const d = decodeContinuous(verse.ctimings?.[reciterId]);
  return d ? [d[0], d[1]] : null;
}

/**
 * Bu bölüm için seçili karinin sure bazlı tilavet adresi (yoksa null).
 *
 * Quran.com karilerinde adres veriyle birlikte gelir. Yalnızca sure kaydı
 * olan karilerde (Islam Sobhi) adres kalıptan üretilir; kısmi bölümlerde
 * dosya tüm sure olacağı için null döner.
 */
export function continuousUrl(surah, reciterId) {
  const stored = surah.continuous_audio?.[reciterId];
  if (stored) return stored;

  const reciter = getReciter(reciterId);
  if (reciter?.surah_base && surah.audio && surah.audio_surah) {
    return `${reciter.surah_base}${pad3(surah.audio_surah)}.mp3`;
  }
  return null;
}

/**
 * Karinin destekleyebildiği takip seviyesi:
 *   "word"  — kelime imleci + ayet vurgusu
 *   "verse" — yalnızca ayet vurgusu (kelime zaman damgası yok)
 *   "none"  — takip yok, yalnızca sure kaydı var
 */
export function reciterSync(reciter) {
  return reciter?.sync ?? "word";
}

export const SYNC_LABELS = {
  word: "Kelime kelime takip",
  verse: "Ayet takibi (kelime imleci yok)",
  none: "Takipsiz — yalnızca dinleme",
};
