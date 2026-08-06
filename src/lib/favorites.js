import { readJson, writeJson } from "./storage";

const KEY = "quran-app:favorites";

export function getFavoriteIds() {
  return readJson(KEY, []);
}

export function isFavorite(surahId) {
  return getFavoriteIds().includes(surahId);
}

export function toggleFavorite(surahId) {
  const ids = getFavoriteIds();
  const next = ids.includes(surahId)
    ? ids.filter((id) => id !== surahId)
    : [...ids, surahId];
  writeJson(KEY, next);
  return next;
}
