import { readJson, writeJson, localDateString } from "./storage";

const COMPLETED_DATES_KEY = "quran-app:completed-dates";
const LAST_READ_KEY = "quran-app:last-read-per-surah";

function getCompletedDates() {
  return readJson(COMPLETED_DATES_KEY, []);
}

/** Bugünü ve verilen sureyi "okundu" olarak işaretler. */
export function markSurahCompleted(surahId) {
  const today = localDateString();

  const dates = getCompletedDates();
  if (!dates.includes(today)) {
    writeJson(COMPLETED_DATES_KEY, [...dates, today]);
  }

  const lastRead = readJson(LAST_READ_KEY, {});
  writeJson(LAST_READ_KEY, { ...lastRead, [surahId]: today });
}

export function getLastReadDate(surahId) {
  const lastRead = readJson(LAST_READ_KEY, {});
  return lastRead[surahId] ?? null;
}

export function hasReadToday() {
  return getCompletedDates().includes(localDateString());
}

/** Bugüne kadar (bugün dahil, henüz okunmadıysa dünden) kaç gün üst üste okunmuş. */
export function getCurrentStreak() {
  const dates = new Set(getCompletedDates());
  let streak = 0;
  const cursor = new Date();

  if (!dates.has(localDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dates.has(localDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Son 7 gün (en eski -> en yeni), her biri için o gün okunup okunmadığı. */
export function getLast7Days() {
  const dates = new Set(getCompletedDates());
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateString(d);
    days.push({ date: key, done: dates.has(key) });
  }

  return days;
}
