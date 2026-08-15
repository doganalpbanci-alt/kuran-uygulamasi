import { readJson, writeJson } from "./storage";

/**
 * Kullanıcının Günlük Okumalar'a kendi eklediği sure/dua kısayolları.
 * type: "quran" (refId = ENTRIES içindeki bir id) veya "dhikr"
 * (refId = daily-recitations.json'daki sabit bir dua öğesinin id'si).
 * Sabit hadis kaynaklı 17 öğeden bağımsız, kullanıcıya özel bir liste.
 */
const KEY = "quran-app:daily-custom";

function sameItem(item, type, refId) {
  return item.type === type && String(item.refId) === String(refId);
}

export function getCustomItems() {
  return readJson(KEY, []);
}

export function isCustomItem(type, refId) {
  return getCustomItems().some((it) => sameItem(it, type, refId));
}

export function addCustomItem(type, refId) {
  const items = getCustomItems();
  if (items.some((it) => sameItem(it, type, refId))) return items;
  const next = [...items, { type, refId }];
  writeJson(KEY, next);
  return next;
}

export function removeCustomItem(type, refId) {
  const next = getCustomItems().filter((it) => !sameItem(it, type, refId));
  writeJson(KEY, next);
  return next;
}

export function toggleCustomItem(type, refId) {
  return isCustomItem(type, refId)
    ? removeCustomItem(type, refId)
    : addCustomItem(type, refId);
}
