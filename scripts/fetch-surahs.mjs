// Build-time script: fetches surah data from Açık Kuran API (https://api.acikkuran.com)
// and writes it to src/data/surahs.json so the app never needs to hit the API at runtime.
//
// Usage: node scripts/fetch-surahs.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE = "https://api.acikkuran.com";
const OUT_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "surahs.json",
);

// MVP kapsamındaki sureler.
const SURAH_IDS = [36, 67, 56, 18]; // Yasin, Mülk, Vakıa, Kehf
const PREFERRED_AUTHOR_NAME = "Diyanet İşleri";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`İstek başarısız: ${url} (${res.status})`);
  }
  const body = await res.json();
  return body.data;
}

async function findAuthorId() {
  const authors = await fetchJson(`${API_BASE}/authors`);
  const preferred = authors.find((a) => a.name === PREFERRED_AUTHOR_NAME);
  if (preferred) return preferred.id;

  const fallback = authors.find((a) => a.language === "tr");
  if (fallback) {
    console.warn(
      `"${PREFERRED_AUTHOR_NAME}" bulunamadı, yerine "${fallback.name}" kullanılıyor.`,
    );
    return fallback.id;
  }

  throw new Error("Türkçe meal yazarı bulunamadı.");
}

function mapVerse(raw) {
  return {
    verse_number: raw.verse_number,
    verse: raw.verse,
    transcription: raw.transcription,
    translation: raw.translation.text,
    start_time: null,
  };
}

async function fetchSurah(id, authorId) {
  const raw = await fetchJson(`${API_BASE}/surah/${id}?author=${authorId}`);

  const verses = [];
  // "zero" alanı besmeleyi ayrı taşır (Tevbe suresi hariç); okuma akışında
  // ilk satır olarak 0 numaralı ayet gibi ele alıyoruz.
  if (raw.zero) {
    verses.push({ ...mapVerse(raw.zero), verse_number: 0 });
  }
  for (const v of raw.verses) {
    verses.push(mapVerse(v));
  }

  return {
    id: raw.id,
    name: raw.name,
    name_translation_tr: raw.name_translation_tr,
    verse_count: raw.verse_count,
    audio: {
      url: raw.audio.mp3,
      duration: raw.audio.duration,
    },
    verses,
  };
}

async function main() {
  console.log("Yazar listesi alınıyor...");
  const authorId = await findAuthorId();
  console.log(`Kullanılan meal yazarı id: ${authorId}`);

  const surahs = [];
  for (const id of SURAH_IDS) {
    console.log(`Sure ${id} çekiliyor...`);
    const surah = await fetchSurah(id, authorId);
    surahs.push(surah);
  }

  const output = {
    author_id: authorId,
    author_name: PREFERRED_AUTHOR_NAME,
    fetched_at: new Date().toISOString(),
    surahs,
  };

  await writeFile(OUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Kaydedildi: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
