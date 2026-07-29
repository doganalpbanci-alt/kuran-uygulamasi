import { readJson, writeJson } from "./storage";

const OVERRIDES_KEY = "quran-app:start-time-overrides";

// Şekil: { [surahId]: { [verse_number]: seconds } }
function getAllOverrides() {
  return readJson(OVERRIDES_KEY, {});
}

export function getOverridesForSurah(surahId) {
  return getAllOverrides()[surahId] ?? {};
}

export function setVerseStartTime(surahId, verseNumber, seconds) {
  const all = getAllOverrides();
  const forSurah = { ...(all[surahId] ?? {}), [verseNumber]: seconds };
  writeJson(OVERRIDES_KEY, { ...all, [surahId]: forSurah });
}

export function clearOverridesForSurah(surahId) {
  const all = getAllOverrides();
  const next = { ...all };
  delete next[surahId];
  writeJson(OVERRIDES_KEY, next);
}

export function exportOverrides() {
  return JSON.stringify(getAllOverrides(), null, 2);
}

export function downloadOverridesFile() {
  const blob = new Blob([exportOverrides()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kuran-app-senkron.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importOverrides(json) {
  const parsed = JSON.parse(json);
  writeJson(OVERRIDES_KEY, parsed);
}
