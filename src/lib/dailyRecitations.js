import data from "../data/daily-recitations.json";
import { getEntry } from "./dataStore";

/**
 * Kur'an tabanlı öğeler (İhlâs/Felâk/Nâs, Âyetü'l-Kürsî, Âmenerrasûlü,
 * Mülk, Haşr son 3 âyet) src/data/index.json'daki entryId'lere işaret
 * eder — metin doğrulanmış Kur'an hattından gelir, burada tekrar
 * yazılmaz. Hadis kaynaklı zikir/dualar kendi Arapça/okunuş/meal
 * alanlarını taşır.
 */
export const DAILY_RECITATIONS = data.items;

/** type: "quran" öğesinin bağlı olduğu bölüm; henüz çekilmemişse null. */
export function quranEntryFor(item) {
  return item.entryId != null ? getEntry(item.entryId) : null;
}

/** type: "quran-group" öğesindeki bölümlerden mevcut olanlar. */
export function quranGroupEntries(item) {
  return (item.entryIds ?? [])
    .map((id) => getEntry(id))
    .filter((e) => e != null);
}

/** Bir öğenin okunmaya hazır olup olmadığı (veri dosyaları çekilmiş mi). */
export function isItemReady(item) {
  if (item.type === "dhikr") return true;
  if (item.type === "quran") return quranEntryFor(item) != null;
  if (item.type === "quran-group") {
    return (
      item.entryIds.length > 0 &&
      quranGroupEntries(item).length === item.entryIds.length
    );
  }
  return false;
}
