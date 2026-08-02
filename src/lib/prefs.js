import { readJson, writeJson } from "./storage";

const PREFS_KEY = "quran-app:prefs";

const DEFAULT_PREFS = {
  lastSurahId: null,
  playbackRate: 1,
  wordCursor: true,
  // Okuma ekranı sekmesi: "arabic-meal" | "translit" | "meal"
  tab: "arabic-meal",
  // Ana ekran sıralaması: "mushaf" | "revelation" (nüzûl)
  surahOrder: "mushaf",
  // Seçili tefsir (index.json'daki tafsirs listesinden)
  tafsirId: null,
  // null ise veri dosyasındaki varsayılanlar kullanılır.
  reciterId: null,
  translationId: null,
  // Tilavet oynatma biçimi: "verse" (ayet ayet dosyalar) veya
  // "continuous" (sure başına tek dosya, kesintisiz)
  recitationMode: "verse",
  reminderEnabled: false,
  reminderTime: "20:00",
  lastNotifiedDate: null,
};

export function getPrefs() {
  return { ...DEFAULT_PREFS, ...readJson(PREFS_KEY, {}) };
}

export function updatePrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  writeJson(PREFS_KEY, next);
  return next;
}
