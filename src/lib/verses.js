import { getOverridesForSurah } from "./sync";

/**
 * Sure ayetlerini, senkron modunda kaydedilmiş start_time override'larıyla
 * birleştirir. Override'lar localStorage'da tutulur (JSON verisi build-time
 * olduğu için değiştirilemez), bu yüzden her okumada üzerine bindirilir.
 */
export function getVersesWithOverrides(surah) {
  const overrides = getOverridesForSurah(surah.id);
  return surah.verses.map((v) => {
    const override = overrides[v.verse_number];
    return override != null ? { ...v, start_time: override } : v;
  });
}

/**
 * Her ayet için "etkin" başlangıç zamanını hesaplar: gerçek start_time
 * varsa onu, yoksa sure süresine oranlayarak kaba bir tahmin kullanır.
 */
export function computeEffectiveStartTimes(verses, duration) {
  const count = verses.length;
  return verses.map((v, i) => {
    if (typeof v.start_time === "number") return v.start_time;
    if (!duration) return 0;
    return (i / count) * duration;
  });
}

/** currentTime'a göre aktif ayet index'ini döndürür. */
export function findActiveVerseIndex(effectiveStartTimes, currentTime) {
  let active = 0;
  for (let i = 0; i < effectiveStartTimes.length; i++) {
    if (effectiveStartTimes[i] <= currentTime) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Okunuşu kelimelere böler ve her kelimeye uzunluğuyla orantılı bir
 * ağırlık verir. Ağırlık, kelimenin okunmasının ne kadar süreceğine dair
 * kaba bir tahmindir (uzun kelime = uzun süre).
 */
export function splitIntoWords(text) {
  if (!text) return [];
  const words = text.split(/(\s+)/).filter((w) => w.length > 0);
  let cumulative = 0;
  const weights = words.map((w) => (/^\s+$/.test(w) ? 0.3 : w.length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  return words.map((word, i) => {
    const start = cumulative / total;
    cumulative += weights[i];
    return { word, start, end: cumulative / total, isSpace: /^\s+$/.test(word) };
  });
}

/**
 * Aktif ayetin içinde sesin nerede olduğunu 0..1 aralığında verir.
 * Ayetin bitişi, bir sonraki ayetin başlangıcıdır (son ayette sure sonu).
 */
export function getVerseProgress(effectiveStartTimes, index, currentTime, duration) {
  const start = effectiveStartTimes[index];
  const end =
    index + 1 < effectiveStartTimes.length
      ? effectiveStartTimes[index + 1]
      : duration;
  if (!(end > start)) return 0;
  return Math.min(Math.max((currentTime - start) / (end - start), 0), 1);
}
