import { readJson, writeJson } from "./storage";

/**
 * Kullanıcının vakte göre (sabah/gece/gün içi) kendi oluşturduğu okuma
 * rutini. Her kayıt bir sureyi ya da mevcut bir duayı, kullanıcının
 * seçtiği bir veya birden çok vakit etiketine bağlar; sabit 17 hadis
 * kaynaklı öğeden bağımsız, tamamen kullanıcıya özeldir. Bir öğe hiçbir
 * vakite bağlı kalmayınca kayıttan tamamen silinir.
 */
const KEY = "quran-app:daily-routine";

function sameItem(item, type, refId) {
  return item.type === type && String(item.refId) === String(refId);
}

export function getRoutineItems() {
  return readJson(KEY, []); // [{ type: "quran"|"dhikr", refId, tags: [] }]
}

function save(items) {
  writeJson(KEY, items);
  return items;
}

export function routineTagsFor(type, refId) {
  return (
    getRoutineItems().find((it) => sameItem(it, type, refId))?.tags ?? []
  );
}

export function isInRoutine(tag, type, refId) {
  return routineTagsFor(type, refId).includes(tag);
}

/** Bir öğe herhangi bir vakit rutinine dahil mi (kart üzerindeki ikon için). */
export function isInAnyRoutine(type, refId) {
  return routineTagsFor(type, refId).length > 0;
}

export function toggleRoutineTag(tag, type, refId) {
  const items = getRoutineItems();
  const idx = items.findIndex((it) => sameItem(it, type, refId));
  if (idx === -1) {
    return save([...items, { type, refId, tags: [tag] }]);
  }
  const existing = items[idx];
  const hasTag = existing.tags.includes(tag);
  const nextTags = hasTag
    ? existing.tags.filter((t) => t !== tag)
    : [...existing.tags, tag];
  const next = [...items];
  if (nextTags.length === 0) {
    next.splice(idx, 1);
  } else {
    next[idx] = { ...existing, tags: nextTags };
  }
  return save(next);
}

export function removeFromRoutineTag(tag, type, refId) {
  return toggleRoutineTag(tag, type, refId);
}

export function routineItemsForTag(tag) {
  return getRoutineItems().filter((it) => it.tags.includes(tag));
}
