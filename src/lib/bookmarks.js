import { readJson, writeJson } from "./storage";

const KEY = "quran-app:bookmarks";

const bookmarkKey = (surahId, verseNumber) => `${surahId}:${verseNumber}`;

export function getBookmarks() {
  return readJson(KEY, []);
}

export function isBookmarked(surahId, verseNumber) {
  const key = bookmarkKey(surahId, verseNumber);
  return getBookmarks().some((b) => b.key === key);
}

/**
 * Yer imini ekler/kaldırır. Bölüm verisi lazy yüklendiği için yer imleri
 * listesi ekranı ayrıca indirme yapmasın diye ayet önizlemesi (meta)
 * işaretlenirken saklanıyor.
 */
export function toggleBookmark(surahId, verseNumber, meta = {}) {
  const key = bookmarkKey(surahId, verseNumber);
  const list = getBookmarks();
  const exists = list.some((b) => b.key === key);
  const next = exists
    ? list.filter((b) => b.key !== key)
    : [...list, { key, surahId, verseNumber, ...meta, createdAt: Date.now() }];
  writeJson(KEY, next);
  return next;
}

export function removeBookmark(surahId, verseNumber) {
  const key = bookmarkKey(surahId, verseNumber);
  writeJson(
    KEY,
    getBookmarks().filter((b) => b.key !== key),
  );
}
