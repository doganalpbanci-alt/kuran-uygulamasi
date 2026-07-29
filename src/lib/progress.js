import { readJson, writeJson } from "./storage";

const PROGRESS_KEY = "quran-app:progress";

// Şekil: { [surahId]: { time: seconds, verseNumber: n } }

export function getProgress(surahId) {
  const all = readJson(PROGRESS_KEY, {});
  return all[surahId] ?? null;
}

export function saveProgress(surahId, { time, verseNumber }) {
  const all = readJson(PROGRESS_KEY, {});
  writeJson(PROGRESS_KEY, { ...all, [surahId]: { time, verseNumber } });
}

export function clearProgress(surahId) {
  const all = readJson(PROGRESS_KEY, {});
  const next = { ...all };
  delete next[surahId];
  writeJson(PROGRESS_KEY, next);
}
