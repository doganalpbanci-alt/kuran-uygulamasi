// Build-time script. İki kaynaktan veri çekip src/data/surahs.json'a yazar,
// böylece uygulama çalışırken hiçbir API'ye gitmez:
//
//   1. Açık Kuran (https://api.acikkuran.com) — Türkçe okunuş, meal ve
//      surenin Türkçe meal sesi (tek mp3).
//   2. Quran.com (https://api.quran.com) — Arapça tilavet (ayet ayet mp3),
//      kelime bazlı zaman damgaları ve Uthmani kelime metinleri.
//
// Usage: node scripts/fetch-surahs.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE = "https://api.acikkuran.com";
const QURAN_API = "https://api.quran.com/api/v4";
const VERSE_AUDIO_BASE = "https://verses.quran.com/";

// Mishari Rashid al-`Afasy. Kelime zaman damgası (segments) sunan
// karilerden biri; başka bir kariye geçilecekse segments desteğini
// doğrulamak gerekir.
const RECITER_ID = 7;
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

async function fetchQuranJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Quran.com isteği başarısız: ${url} (${res.status})`);
  }
  return res.json();
}

/**
 * Bir sure için Arapça tilaveti toplar: ayet başına mp3 adresi, kelime
 * metinleri ve kelimelerin ses içindeki başlangıç/bitiş milisaniyeleri.
 *
 * segments biçimi: [segmentIndex, wordPosition, startMs, endMs]. wordPosition,
 * kelime listesindeki 1 tabanlı sıradır; eşleştirmeyi buna göre yapıyoruz,
 * dizideki sıraya güvenmiyoruz.
 */
async function fetchArabicRecitation(surahId) {
  const [audio, verses] = await Promise.all([
    fetchQuranJson(
      `${QURAN_API}/recitations/${RECITER_ID}/by_chapter/${surahId}?fields=segments&per_page=300`,
    ),
    fetchQuranJson(
      `${QURAN_API}/verses/by_chapter/${surahId}?words=true&word_fields=text_uthmani&per_page=300`,
    ),
  ]);

  const wordsByKey = new Map();
  for (const v of verses.verses) {
    wordsByKey.set(
      v.verse_key,
      v.words.filter((w) => w.char_type_name === "word"),
    );
  }

  const byVerseNumber = new Map();
  for (const file of audio.audio_files) {
    const verseNumber = Number(file.verse_key.split(":")[1]);
    const words = wordsByKey.get(file.verse_key) ?? [];
    const timingByPosition = new Map();
    for (const seg of file.segments ?? []) {
      const [, position, startMs, endMs] = seg;
      timingByPosition.set(position, [startMs, endMs]);
    }

    byVerseNumber.set(verseNumber, {
      url: VERSE_AUDIO_BASE + file.url,
      words: words.map((w) => {
        const timing = timingByPosition.get(w.position);
        return {
          text: w.text_uthmani,
          // Zaman damgası olmayan kelime olursa imleç onu atlar,
          // oynatma yine de sorunsuz devam eder.
          start: timing ? timing[0] : null,
          end: timing ? timing[1] : null,
        };
      }),
    });
  }

  return byVerseNumber;
}

/** Besmele: Fatiha 1:1 kaydı, 0 numaralı ayet için kullanılıyor. */
async function fetchBismillah() {
  const arabic = await fetchArabicRecitation(1);
  return arabic.get(1) ?? null;
}

async function fetchSurah(id, authorId, bismillah) {
  const raw = await fetchJson(`${API_BASE}/surah/${id}?author=${authorId}`);

  const arabic = await fetchArabicRecitation(id);

  const verses = [];
  // "zero" alanı besmeleyi ayrı taşır (Tevbe suresi hariç); okuma akışında
  // ilk satır olarak 0 numaralı ayet gibi ele alıyoruz.
  if (raw.zero) {
    verses.push({
      ...mapVerse(raw.zero),
      verse_number: 0,
      arabic: bismillah,
    });
  }
  for (const v of raw.verses) {
    verses.push({
      ...mapVerse(v),
      arabic: arabic.get(v.verse_number) ?? null,
    });
  }

  const missing = verses.filter((v) => !v.arabic).length;
  if (missing > 0) {
    console.warn(`  uyarı: ${missing} ayette Arapça tilavet bulunamadı`);
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

async function fetchReciter() {
  const { recitations } = await fetchQuranJson(
    `${QURAN_API}/resources/recitations`,
  );
  const found = recitations.find((r) => r.id === RECITER_ID);
  if (!found) throw new Error(`Kari bulunamadı: id ${RECITER_ID}`);
  return { id: found.id, name: found.reciter_name, style: found.style };
}

async function main() {
  console.log("Yazar listesi alınıyor...");
  const authorId = await findAuthorId();
  console.log(`Kullanılan meal yazarı id: ${authorId}`);

  const reciter = await fetchReciter();
  console.log(`Kullanılan kari: ${reciter.name} (id ${reciter.id})`);

  console.log("Besmele kaydı alınıyor...");
  const bismillah = await fetchBismillah();

  const surahs = [];
  for (const id of SURAH_IDS) {
    console.log(`Sure ${id} çekiliyor...`);
    const surah = await fetchSurah(id, authorId, bismillah);
    surahs.push(surah);
  }

  const output = {
    author_id: authorId,
    author_name: PREFERRED_AUTHOR_NAME,
    reciter,
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
