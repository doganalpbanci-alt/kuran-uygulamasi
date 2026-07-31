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

// Uygulamadaki bölümler. Tamamı okunan sureler için sadece `surah`
// yeterli; bir surenin bir bölümü alınacaksa `from`/`to` verilir.
//
// Kısmi bölümlerde Türkçe meal sesi olmaz: Açık Kuran sesi sure başına tek
// dosya sunuyor, Âmenerrasûlü için bu Bakara'nın tamamı olurdu. Arapça
// tilavet ayet başına ayrı dosya olduğu için kısmi bölümlerde de çalışır.
const ENTRIES = [
  { surah: 36 }, // Yasin
  { surah: 67 }, // Mülk
  { surah: 56 }, // Vakıa
  { surah: 18 }, // Kehf
  { surah: 44 }, // Duhan
  {
    surah: 2,
    from: 285,
    to: 286,
    id: "amenerrasulu",
    name: "Âmenerrasûlü",
    subtitle: "Bakara suresi 285-286",
  },
];

// Ayarlardan seçilebilecek mealler. Offline çalışması için hepsi
// uygulamaya gömülüyor, o yüzden liste bilinçli olarak dar tutuldu.
//
// İki farklı kaynak kullanıldığı ve id uzayları çakıştığı için (Açık
// Kuran'da 22 = Muhammed Esed, Quran.com'da 22 = Yusuf Ali) id'ler
// "tr-11", "en-20" biçiminde önekleniyor.
const TR_TRANSLATION_IDS = [
  11, // Diyanet İşleri (varsayılan)
  14, // Elmalılı Hamdi Yazır
  15, // Elmalılı (sadeleştirilmiş)
  6, // Ali Bulaç
  22, // Muhammed Esed
  27, // Süleyman Ateş
  26, // Suat Yıldırım
  30, // Yaşar Nuri Öztürk
];
const EN_TRANSLATION_IDS = [
  20, // Saheeh International
  85, // M.A.S. Abdel Haleem
  19, // M. Pickthall
  22, // A. Yusuf Ali
];
const DEFAULT_TRANSLATION_ID = "tr-11";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`İstek başarısız: ${url} (${res.status})`);
  }
  const body = await res.json();
  return body.data;
}

/** Quran.com çevirileri dipnotları HTML olarak gömüyor; sade metne indiriyoruz. */
function stripHtml(text) {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Seçilen Türkçe ve İngilizce mealleri isimleriyle birlikte doğrular. */
async function fetchTranslations() {
  const out = [];

  const authors = await fetchJson(`${API_BASE}/authors`);
  for (const id of TR_TRANSLATION_IDS) {
    const found = authors.find((a) => a.id === id);
    if (!found) {
      console.warn(`  atlandı: Türkçe meal id ${id} bulunamadı`);
      continue;
    }
    out.push({ id: `tr-${found.id}`, source_id: found.id, name: found.name, lang: "tr" });
  }

  const { translations } = await fetchQuranJson(
    `${QURAN_API}/resources/translations?language=en`,
  );
  for (const id of EN_TRANSLATION_IDS) {
    const found = translations.find((t) => t.id === id);
    if (!found) {
      console.warn(`  atlandı: İngilizce meal id ${id} bulunamadı`);
      continue;
    }
    out.push({ id: `en-${found.id}`, source_id: found.id, name: found.name, lang: "en" });
  }

  if (out.length === 0) throw new Error("Hiç meal bulunamadı.");
  return out;
}

/**
 * Bir sure için İngilizce çeviriyi ayet numarasına eşler.
 * Quran.com bu uçta verse_key döndürmüyor, dizi ayet sırasında geliyor.
 */
async function fetchEnglishTranslation(sourceId, surahId) {
  const { translations } = await fetchQuranJson(
    `${QURAN_API}/quran/translations/${sourceId}?chapter_number=${surahId}`,
  );
  const byVerseNumber = new Map();
  translations.forEach((t, i) => {
    byVerseNumber.set(i + 1, stripHtml(t.text));
  });
  return byVerseNumber;
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
 * Sure başına tek dosya tilavet + o dosyaya göre MUTLAK ayet ve kelime
 * zaman damgaları. Ayet ayet dosyalardaki göreli zamanlardan türetmek
 * mümkün değil: iki kayıttaki sessizlik payları farklı, Mülk/Alafasy'de
 * sapma 3.5 saniyeye kadar çıkıyor.
 *
 * Dönen yapı: { url, byVerse: Map<verseNumber, [from, to, w1s, w1e, ...]> }
 */
async function fetchContinuous(reciterId, surahId) {
  const { audio_file: file } = await fetchQuranJson(
    `${QURAN_API}/chapter_recitations/${reciterId}/${surahId}?segments=true`,
  );
  if (!file?.timestamps?.length) return null;

  const byVerse = new Map();
  for (const t of file.timestamps) {
    const verseNumber = Number(t.verse_key.split(":")[1]);
    const from = Number(t.timestamp_from);

    // Mutlak milisaniyeler 6-7 haneli; ayet başına göreli + ardışık fark
    // olarak saklayınca sayılar küçülüyor ve gzip belirgin şekilde
    // daralıyor (177 KB -> 101 KB). Çözme lib/recitation.js içinde.
    const out = [from, Number(t.timestamp_to) - from];
    let prev = 0;
    for (const seg of t.segments ?? []) {
      // Kaynakta eksik segment olabiliyor (örn. Kehf 18:60'ta bitiş yok);
      // o kelime sıfır uzunlukta kalır, yani hiç vurgulanmaz.
      const s = seg.length >= 3 ? Number(seg[1]) - from : prev;
      const e = seg.length >= 3 ? Number(seg[2]) - from : prev;
      out.push(s - prev);
      out.push(e - s);
      prev = e;
    }
    byVerse.set(verseNumber, out);
  }

  return { url: file.audio_url, byVerse };
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

async function fetchSurah(entry, translations, reciters, bismillah) {
  const id = entry.surah;
  const isPartial = entry.from != null;
  const trList = translations.filter((t) => t.lang === "tr");
  const enList = translations.filter((t) => t.lang === "en");

  // Türkçe mealler: her biri Açık Kuran'da ayrı bir istek.
  const byTranslation = new Map();
  for (const t of trList) {
    byTranslation.set(
      t.id,
      await fetchJson(`${API_BASE}/surah/${id}?author=${t.source_id}`),
    );
  }
  const raw = byTranslation.get(trList[0].id);

  // İngilizce mealler Quran.com'dan, ayet numarasına eşlenmiş halde.
  const byEnglish = new Map();
  for (const t of enList) {
    byEnglish.set(t.id, await fetchEnglishTranslation(t.source_id, id));
  }

  const wordsByVerse = await fetchArabicWords(id);

  const timingsByReciter = new Map();
  for (const r of reciters) {
    timingsByReciter.set(r.id, await fetchTimings(r.id, id, wordsByVerse));
  }

  // Sürekli (tek dosya) tilavet. Kısmi bölümlerde anlamsız: Âmenerrasûlü
  // için dosya Bakara'nın tamamı olurdu.
  const continuousByReciter = new Map();
  const continuousAudio = {};
  if (!isPartial) {
    for (const r of reciters) {
      const c = await fetchContinuous(r.id, id);
      if (!c) {
        console.warn(`  uyarı: kari ${r.id} için sürekli tilavet yok`);
        continue;
      }
      continuousByReciter.set(r.id, c.byVerse);
      continuousAudio[r.id] = c.url;
    }
  }

  /** Bir ayetin tüm meallerini toplar. */
  const translationsFor = (verseNumber, isZero) => {
    const out = {};
    for (const t of trList) {
      const surah = byTranslation.get(t.id);
      const v = isZero
        ? surah.zero
        : surah.verses.find((x) => x.verse_number === verseNumber);
      if (v?.translation?.text) out[t.id] = v.translation.text;
    }
    for (const t of enList) {
      // Besmele satırı için Fatiha 1:1 çevirisi ayrıca alınıyor.
      const text = isZero
        ? bismillah?.english?.[t.id]
        : byEnglish.get(t.id)?.get(verseNumber);
      if (text) out[t.id] = text;
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
    // Sürekli tilavetin mutlak zamanları (varsa).
    const ctimings = {};
    for (const r of reciters) {
      const c = continuousByReciter.get(r.id)?.get(verseNumber);
      if (c) ctimings[r.id] = c;
    }

    return {
      verse_number: verseNumber,
      transcription: raw2.transcription,
      translations: translationsFor(verseNumber, isZero),
      arabic_words: words.map((w) => w.text),
      timings,
      ctimings,
      start_time: null,
    };
  };

  const verses = [];
  // "zero" alanı besmeleyi ayrı taşır (Tevbe suresi hariç); okuma akışında
  // ilk satır olarak 0 numaralı ayet gibi ele alıyoruz. Sesi ve kelimeleri
  // Fatiha 1:1'den gelir. Sure ortasından alınan bölümlerde besmele olmaz.
  if (raw.zero && !isPartial) {
    // english yalnızca translationsFor içinde kullanılıyor, ayete yazılmaz.
    const { english: _ignored, ...bismillahVerse } = bismillah;
    verses.push({ ...buildVerse(raw.zero, 0, true), ...bismillahVerse });
  }
  for (const v of raw.verses) {
    if (isPartial && (v.verse_number < entry.from || v.verse_number > entry.to)) {
      continue;
    }
    verses.push(buildVerse(v, v.verse_number));
  }

  const missing = verses.filter((v) => !v.arabic_words?.length).length;
  if (missing > 0) {
    console.warn(`  uyarı: ${missing} ayette Arapça kelime bulunamadı`);
  }

  return {
    id: entry.id ?? raw.id,
    // Tilavet adresleri <sure3><ayet3>.mp3 kalıbından üretiliyor; kısmi
    // bölümlerde id metinsel olduğu için kaynak sure numarası ayrı tutuluyor.
    audio_surah: id,
    name: entry.name ?? raw.name,
    subtitle: entry.subtitle ?? raw.name_translation_tr,
    verse_count: verses.filter((v) => v.verse_number > 0).length,
    // Türkçe meal sesi yalnızca tam surelerde var.
    audio: isPartial
      ? null
      : { url: raw.audio.mp3, duration: raw.audio.duration },
    // Kari id -> sure başına tek dosya tilavet adresi.
    continuous_audio: continuousAudio,
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
async function fetchBismillah(reciters, translations) {
  const words = await fetchArabicWords(1);
  const timings = {};
  for (const r of reciters) {
    const t = await fetchTimings(r.id, 1, words);
    const flat = t.get(1);
    if (flat) timings[r.id] = flat;
  }

  // İngilizce mealler besmeleyi Fatiha'nın 1. ayeti olarak veriyor.
  const english = {};
  for (const t of translations.filter((x) => x.lang === "en")) {
    const map = await fetchEnglishTranslation(t.source_id, 1);
    const text = map.get(1);
    if (text) english[t.id] = text;
  }
  // Ses adresi 0. ayet için verseAudioUrl tarafından 001001'e çevrildiğinden
  // burada tutulmasına gerek yok.
  return {
    arabic_words: (words.get(1) ?? []).map((w) => w.text),
    timings,
    english,
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
  const bismillah = await fetchBismillah(reciters, translations);

  const surahs = [];
  for (const entry of ENTRIES) {
    const label = entry.from
      ? `Sure ${entry.surah} ayet ${entry.from}-${entry.to}`
      : `Sure ${entry.surah}`;
    console.log(`${label} çekiliyor...`);
    surahs.push(await fetchSurah(entry, translations, reciters, bismillah));
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
