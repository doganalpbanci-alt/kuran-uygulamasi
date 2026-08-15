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

/** Ana sekmeler: iki sabit hadis kaynaklı liste + kullanıcının kendi eklediği. */
export const DAILY_CATEGORIES = [
  { id: "okumalar", label: "Günlük Okumalar" },
  { id: "dualar", label: "Dualar" },
  { id: "eklenenler", label: "Eklediklerim" },
];

/**
 * Vakit filtre çipleri. Yalnızca bu üçü — namaz_sonrasi ayrı bir çip
 * değil, kartta bilgi olarak görünür ama filtrelenemez (istenen budur).
 */
export const TIME_TAGS = [
  { id: "sabah_rutini", label: "Sabah Rutini" },
  { id: "gece_rutini", label: "Gece Rutini" },
  { id: "gun_ici", label: "Gün İçi" },
];

const TAG_LABELS = {
  sabah_rutini: "Sabah Rutini",
  gece_rutini: "Gece Rutini",
  namaz_sonrasi: "Namaz Sonrası",
  gun_ici: "Gün İçi",
};

export function tagLabel(tag) {
  return TAG_LABELS[tag] ?? tag;
}

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

/** Kullanıcının Sureler ekranından/Ekle menüsünden seçtiği sabit dua öğesi. */
export function builtinDhikrById(id) {
  return (
    DAILY_RECITATIONS.find((it) => it.type === "dhikr" && it.id === id) ??
    null
  );
}

/**
 * Kullanıcının kendi eklediği bir sureyi "quran" tipi görüntülenebilir bir
 * öğeye çevirir; ENTRIES içinde artık bulunmuyorsa null döner.
 */
export function customQuranDisplayItem(entryId) {
  const entry = quranEntryFor({ entryId });
  if (!entry) return null;
  return {
    id: `custom-quran-${entryId}`,
    category: "eklenenler",
    type: "quran",
    name: entry.name,
    occasion: "Kişisel listen",
    repeat: "—",
    source: "Kendi eklediğin",
    tags: [],
    entryId,
  };
}

/**
 * lib/dailyCustomItems.js'teki { type, refId } kayıtlarını görüntülenebilir
 * öğelere çevirir; artık geçerli olmayanları (silinmiş referans) eler.
 */
export function resolveCustomItems(customItems) {
  return customItems
    .map((it) =>
      it.type === "dhikr"
        ? builtinDhikrById(it.refId)
        : customQuranDisplayItem(it.refId),
    )
    .filter((it) => it != null);
}
