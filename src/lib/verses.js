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
