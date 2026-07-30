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

// Varsayılan kari (Mishari Rashid al-`Afasy). Kullanıcı ayarlardan
// değiştirebilir; hepsi çekilir.
const DEFAULT_RECITER_ID = 7;
const OUT_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "surahs.json",
);

// MVP kapsamındaki sureler.
const SURAH_IDS = [36, 67, 56, 18]; // Yasin, Mülk, Vakıa, Kehf

// Ayarlardan seçilebilecek mealler. Offline çalışması için hepsi
// uygulamaya gömülüyor, o yüzden liste bilinçli olarak dar tutuldu.
const TRANSLATION_IDS = [
  11, // Diyanet İşleri (varsayılan)
  14, // Elmalılı Hamdi Yazır
  15, // Elmalılı (sadeleştirilmiş)
  6, // Ali Bulaç
  22, // Muhammed Esed
  27, // Süleyman Ateş
  26, // Suat Yıldırım
  30, // Yaşar Nuri Öztürk
];
const DEFAULT_TRANSLATION_ID = 11;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`İstek başarısız: ${url} (${res.status})`);
  }
  const body = await res.json();
  return body.data;
}

/** Seçilen meal id'lerini isimleriyle birlikte doğrular. */
async function fetchTranslations() {
  const authors = await fetchJson(`${API_BASE}/authors`);
  const out = [];
  for (const id of TRANSLATION_IDS) {
    const found = authors.find((a) => a.id === id);
    if (!found) {
      console.warn(`  atlandı: meal id ${id} bulunamadı`);
      continue;
    }
    out.push({ id: found.id, name: found.name });
  }
  if (out.length === 0) throw new Error("Hiç meal bulunamadı.");
  return out;
}

async function fetchQuranJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Quran.com isteği başarısız: ${url} (${res.status})`);
  }
  return res.json();
}

/** Bir surenin Arapça kelime metinleri (kariden bağımsız, bir kez saklanır). */
async function fetchArabicWords(surahId) {
  const data = await fetchQuranJson(
    `${QURAN_API}/verses/by_chapter/${surahId}?words=true&word_fields=text_uthmani&per_page=300`,
  );

  const byVerseNumber = new Map();
  for (const v of data.verses) {
    const verseNumber = Number(v.verse_key.split(":")[1]);
    byVerseNumber.set(
      verseNumber,
      v.words
        .filter((w) => w.char_type_name === "word")
        .map((w) => ({ position: w.position, text: w.text_uthmani })),
    );
  }
  return byVerseNumber;
}

/**
 * Bir kari + sure için kelime zaman damgalarını toplar.
 *
 * segments biçimi: [segmentIndex, wordPosition, startMs, endMs]. Eşleştirmeyi
 * wordPosition üzerinden yapıyoruz, dizideki sıraya güvenmiyoruz. Sonuç,
 * kelime sırasına göre düz bir sayı dizisi: [başlangıç, bitiş, başlangıç, ...]
 * — 12 kari × 3000 kelime saklandığı için nesne yerine düz dizi tercih edildi.
 */
async function fetchTimings(reciterId, surahId, wordsByVerse) {
  const data = await fetchQuranJson(
    `${QURAN_API}/recitations/${reciterId}/by_chapter/${surahId}?fields=segments&per_page=300`,
  );

  const byVerseNumber = new Map();
  for (const file of data.audio_files) {
    const verseNumber = Number(file.verse_key.split(":")[1]);
    const words = wordsByVerse.get(verseNumber) ?? [];

    const byPosition = new Map();
    for (const seg of file.segments ?? []) {
      // Bazı kariler segment değerlerini sayı, bazıları string döndürüyor
      // (örn. [0,1,60,1070] ve ['0','1','2050','3760']); hepsini sayıya
      // çeviriyoruz, aksi halde pozisyon eşleşmesi sessizce başarısız olur.
      const [, position, startMs, endMs] = seg.map(Number);
      byPosition.set(position, [startMs, endMs]);
    }

    const flat = [];
    for (const w of words) {
      const t = byPosition.get(w.position);
      // Zaman damgası yoksa -1: imleç o kelimeyi atlar, oynatma sürer.
      flat.push(t ? t[0] : -1, t ? t[1] : -1);
    }
    byVerseNumber.set(verseNumber, flat);
  }
  return byVerseNumber;
}

/**
 * Kari başına ses adresi şablonu. Adresler formülsel olduğu için ayet ayet
 * saklamak yerine önek tutuyoruz: önek + <sure3><ayet3>.mp3
 */
function audioBaseFrom(sampleUrl) {
  const absolute = sampleUrl.startsWith("//")
    ? `https:${sampleUrl}`
    : sampleUrl.startsWith("http")
      ? sampleUrl
      : VERSE_AUDIO_BASE + sampleUrl;
  return absolute.replace(/\d{6}\.mp3$/, "");
}

async function fetchSurah(id, translations, reciters, bismillah) {
  // Her meal ayrı bir istek gerektiriyor; ilkini yapı için de kullanıyoruz.
  const byTranslation = new Map();
  for (const t of translations) {
    byTranslation.set(
      t.id,
      await fetchJson(`${API_BASE}/surah/${id}?author=${t.id}`),
    );
  }
  const raw = byTranslation.get(translations[0].id);

  const wordsByVerse = await fetchArabicWords(id);

  const timingsByReciter = new Map();
  for (const r of reciters) {
    timingsByReciter.set(r.id, await fetchTimings(r.id, id, wordsByVerse));
  }

  /** Bir ayetin tüm meallerini toplar. */
  const translationsFor = (verseNumber, isZero) => {
    const out = {};
    for (const t of translations) {
      const surah = byTranslation.get(t.id);
      const v = isZero
        ? surah.zero
        : surah.verses.find((x) => x.verse_number === verseNumber);
      if (v?.translation?.text) out[t.id] = v.translation.text;
    }
    return out;
  };

  const buildVerse = (raw2, verseNumber, isZero = false) => {
    const words = wordsByVerse.get(isZero ? 1 : verseNumber) ?? [];
    const timings = {};
    for (const r of reciters) {
      const t = timingsByReciter.get(r.id)?.get(verseNumber);
      if (t) timings[r.id] = t;
    }
    return {
      verse_number: verseNumber,
      transcription: raw2.transcription,
      translations: translationsFor(verseNumber, isZero),
      arabic_words: words.map((w) => w.text),
      timings,
      start_time: null,
    };
  };

  const verses = [];
  // "zero" alanı besmeleyi ayrı taşır (Tevbe suresi hariç); okuma akışında
  // ilk satır olarak 0 numaralı ayet gibi ele alıyoruz. Sesi ve kelimeleri
  // Fatiha 1:1'den gelir.
  if (raw.zero) {
    verses.push({ ...buildVerse(raw.zero, 0, true), ...bismillah });
  }
  for (const v of raw.verses) {
    verses.push(buildVerse(v, v.verse_number));
  }

  const missing = verses.filter((v) => !v.arabic_words?.length).length;
  if (missing > 0) {
    console.warn(`  uyarı: ${missing} ayette Arapça kelime bulunamadı`);
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

/** Tüm karileri, ses adresi öneki ve segment desteğiyle birlikte getirir. */
async function fetchReciters() {
  const { recitations } = await fetchQuranJson(
    `${QURAN_API}/resources/recitations`,
  );

  const out = [];
  for (const r of recitations) {
    const probe = await fetchQuranJson(
      `${QURAN_API}/recitations/${r.id}/by_chapter/67?fields=segments&per_page=1`,
    );
    const file = probe.audio_files?.[0];
    if (!file?.segments?.length) {
      console.warn(`  atlandı: ${r.reciter_name} — kelime zaman damgası yok`);
      continue;
    }
    out.push({
      id: r.id,
      name: r.reciter_name,
      style: r.style ?? null,
      audio_base: audioBaseFrom(file.url),
    });
  }
  return out;
}

/** Besmele (Fatiha 1:1) — her surenin 0. ayeti için. */
async function fetchBismillah(reciters) {
  const words = await fetchArabicWords(1);
  const timings = {};
  for (const r of reciters) {
    const t = await fetchTimings(r.id, 1, words);
    const flat = t.get(1);
    if (flat) timings[r.id] = flat;
  }
  // Ses adresi 0. ayet için verseAudioUrl tarafından 001001'e çevrildiğinden
  // burada tutulmasına gerek yok.
  return {
    arabic_words: (words.get(1) ?? []).map((w) => w.text),
    timings,
  };
}

async function main() {
  console.log("Meal listesi alınıyor...");
  const translations = await fetchTranslations();
  console.log(`Kullanılacak meal: ${translations.length}`);
  for (const t of translations) console.log(`  ${t.id}: ${t.name}`);

  console.log("Kari listesi ve segment desteği kontrol ediliyor...");
  const reciters = await fetchReciters();
  console.log(`Kullanılabilir kari: ${reciters.length}`);
  for (const r of reciters) {
    console.log(`  ${r.id}: ${r.name}${r.style ? ` (${r.style})` : ""}`);
  }

  console.log("Besmele kaydı alınıyor...");
  const bismillah = await fetchBismillah(reciters);

  const surahs = [];
  for (const id of SURAH_IDS) {
    console.log(`Sure ${id} çekiliyor...`);
    surahs.push(await fetchSurah(id, translations, reciters, bismillah));
  }

  const output = {
    translations,
    default_translation_id: DEFAULT_TRANSLATION_ID,
    reciters,
    default_reciter_id: DEFAULT_RECITER_ID,
    fetched_at: new Date().toISOString(),
    surahs,
  };

  // Zaman damgaları çok sayıda olduğu için çıktı sıkıştırılmış yazılıyor;
  // girintili hali dosyayı gereksiz yere iki katına çıkarıyor.
  await writeFile(OUT_FILE, JSON.stringify(output), "utf-8");
  console.log(`Kaydedildi: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
