// Build-time script. İki kaynaktan veri çekip src/data/index.json ve
// public/data/*.json dosyalarına yazar, böylece uygulama çalışırken hiçbir
// API'ye gitmez:
//
//   1. Açık Kuran (https://api.quran.so) — Türkçe okunuş, meal ve surenin
//      Türkçe meal sesi (tek mp3). Eski adres api.acikkuran.com DNS'ten
//      kalktı; aynı API aynı yazar id'leriyle quran.so altında sürüyor.
//   2. Quran.com (https://api.quran.com) — Arapça tilavet (ayet ayet mp3),
//      kelime bazlı zaman damgaları ve Uthmani kelime metinleri.
//
// Kullanım:
//   node scripts/fetch-surahs.mjs            # eksik bölümleri çeker (resume)
//   node scripts/fetch-surahs.mjs --force    # her şeyi yeniden çeker
//   node scripts/fetch-surahs.mjs --only 2,36  # yalnızca verilen bölümler
//
// 114 sure tek oturumda ~1 saat sürdüğü ve ağ hatası kaçınılmaz olduğu için
// her bölüm bittiğinde ara çıktı .cache/entries/<id>.json'a yazılır; script
// yeniden çalıştırıldığında tamamlananlar atlanır.

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE = "https://api.quran.so";
export const QURAN_API = "https://api.quran.com/api/v4";
const VERSE_AUDIO_BASE = "https://verses.quran.com/";

// Varsayılan kari (Mishari Rashid al-`Afasy). Kullanıcı ayarlardan
// değiştirebilir; hepsi çekilir.
const DEFAULT_RECITER_ID = 7;

// Zaman damgası olmayan kariler artık veri dosyasında değil,
// src/lib/extraReciters.js içinde tanımlı — eklemek için veriyi
// yeniden çekmeye gerek yok.

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Küçük ve her açılışta gereken meta veri uygulamayla birlikte paketlenir.
export const INDEX_FILE = path.join(ROOT, "src", "data", "index.json");
// Ayet ve tefsir verisi public/ altında: paketlenmez, açıldıkça indirilir
// ve service worker tarafından kalıcı olarak cache'lenir.
export const DATA_DIR = path.join(ROOT, "public", "data");
// Tamamlanan bölümlerin index kaydı. Yalnızca çekim sırasında kullanılır,
// depoya girmez (.gitignore); resume bilgisini burada tutuyoruz.
const CACHE_DIR = path.join(ROOT, ".cache", "entries");

// Tefsirler. quran.com'da Türkçe tefsir yok; İngilizce İbn Kesir blok
// bazlı (bir kayıt birden çok ayeti kapsıyor), tam istenen biçimde.
export const TAFSIRS = [
  { id: "en-ibn-kathir", source_id: 169, name: "Ibn Kathir (Abridged)", lang: "en" },
];

// Uygulamadaki bölümler: Kur'an'ın 114 suresinin tamamı, artı sık okunan
// kısmi bölümler (Âmenerrasûlü gibi). Tamamı okunan sureler için sadece
// `surah` yeterli; bir surenin bir bölümü alınacaksa `from`/`to` verilir.
//
// Kısmi bölümlerde Türkçe meal sesi olmaz: Açık Kuran sesi sure başına tek
// dosya sunuyor, Âmenerrasûlü için bu Bakara'nın tamamı olurdu. Arapça
// tilavet ayet başına ayrı dosya olduğu için kısmi bölümlerde de çalışır.
const SURAH_COUNT = 114;

// Günlük Okumalar (hadisle sabit zikir/dua listesi) sekmesinden ve ana
// listeden açılan kısmi bölümler. Kendi id'leri var; ait oldukları sure
// zaten ayrıca tam olarak çekiliyor, bu kayıtlar onun yerine geçmiyor.
const PARTIAL_ENTRIES = [
  {
    surah: 2,
    from: 255,
    to: 255,
    id: "ayetelkursi",
    name: "Âyetü'l-Kürsî",
    subtitle: "Bakara suresi 255",
  },
  {
    surah: 2,
    from: 285,
    to: 286,
    id: "amenerrasulu",
    name: "Âmenerrasûlü",
    subtitle: "Bakara suresi 285-286",
  },
  {
    surah: 59,
    from: 22,
    to: 24,
    id: "hasr-son3",
    name: "Haşr Suresi (Son 3 Âyet)",
    subtitle: "Haşr suresi 22-24",
  },
];

const ENTRIES = [
  ...Array.from({ length: SURAH_COUNT }, (_, i) => ({ surah: i + 1 })),
  ...PARTIAL_ENTRIES,
];

// Ayarlardan seçilebilecek mealler. Offline çalışması için hepsi
// uygulamaya gömülüyor, o yüzden liste bilinçli olarak dar tutuldu.
//
// İki farklı kaynak kullanıldığı ve id uzayları çakıştığı için (Açık
// Kuran'da 22 = Muhammed Esed, Quran.com'da 22 = Yusuf Ali) id'ler
// "tr-11", "en-20" biçiminde önekleniyor.
export const TR_TRANSLATION_IDS = [
  11, // Diyanet İşleri (varsayılan)
  14, // Elmalılı Hamdi Yazır
  15, // Elmalılı (sadeleştirilmiş)
  6, // Ali Bulaç
  22, // Muhammed Esed
  27, // Süleyman Ateş
  30, // Yaşar Nuri Öztürk
  19, // Hasan Basri Çantay
];
export const EN_TRANSLATION_IDS = [
  20, // Saheeh International
  85, // M.A.S. Abdel Haleem
  19, // M. Pickthall
  22, // A. Yusuf Ali
];
const DEFAULT_TRANSLATION_ID = "tr-11";

// Bir bölüm içinde aynı anda uçan istek sayısı. 8 meal + 12 kari zaman
// damgası + 12 sürekli tilavet, sure başına ~35 istek eder; sırayla
// gidince 114 sure saatler alıyor, sınırsız paralellikte quran.com 429
// dönüyor.
const REQUEST_CONCURRENCY = 4;

/**
 * Ağ isteklerini yeniden dener. 114 sure ~4000 istek demek; bu ölçekte
 * geçici bir 5xx/timeout kesin oluyor ve tek bir hata tüm çekimi
 * düşürmemeli. Kalıcı hatalarda (404 gibi) denemeye devam etmiyoruz.
 */
async function withRetry(label, fn, { attempts = 5 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err?.permanent) break;
      const waitMs = 1000 * 2 ** i;
      console.warn(
        `  yeniden deneniyor (${i + 1}/${attempts}, ${waitMs}ms): ${label} — ${err.message}`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

/** İstek + JSON çözme; 4xx kalıcı sayılır, 5xx/ağ hatası yeniden denenir. */
async function requestJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Ağ hatası: ${url} — ${err.message}`);
  }
  if (!res.ok) {
    const err = new Error(`İstek başarısız: ${url} (${res.status})`);
    if (res.status >= 400 && res.status < 500) err.permanent = true;
    throw err;
  }
  return res.json();
}

/**
 * Aynı anda kaç istek uçacağını sınırlar. Sınırsız paralellikte quran.com
 * 429 dönüyor; sırayla gidince 114 sure saatler alıyor.
 */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchJson(url) {
  const body = await withRetry(url, () => requestJson(url));
  return body.data;
}

/**
 * Tefsir metni HTML olarak geliyor ve uygulamada dangerouslySetInnerHTML ile
 * basılıyor. Çalışma anında temizlemek yerine burada bir kez arındırıyoruz:
 * script/style/iframe blokları ve olay öznitelikleri atılıyor.
 */
export function sanitizeHtml(html) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

/** Quran.com çevirileri dipnotları HTML olarak gömüyor; sade metne indiriyoruz. */
export function stripHtml(text) {
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
 * Bir sure için İngilizce çevirileri ayet numarasına eşler.
 *
 * Önemli: /quran/translations ucu verse_key döndürmüyor, yalnızca ayet
 * sırasında bir dizi veriyor — dizideki tek bir eksik/fazla kayıt tüm
 * sureyi sessizce kaydırır. Meal doğruluğu kritik olduğu için ayet
 * anahtarı döndüren /verses/by_chapter ucu kullanılıyor ve eşleştirme
 * verse_key ile yapılıyor.
 *
 * Dönen yapı: Map<verseNumber, Map<resourceId, text>>
 */
export async function fetchEnglishTranslations(sourceIds, surahId) {
  const data = await fetchQuranJson(
    `${QURAN_API}/verses/by_chapter/${surahId}` +
      `?translations=${sourceIds.join(",")}&fields=verse_key&per_page=300`,
  );

  const byVerseNumber = new Map();
  for (const v of data.verses) {
    const [chapter, verseNumber] = v.verse_key.split(":").map(Number);
    if (chapter !== surahId) {
      throw new Error(`Beklenmedik sure: ${v.verse_key} (beklenen ${surahId})`);
    }
    const byResource = new Map();
    for (const t of v.translations ?? []) {
      byResource.set(t.resource_id, stripHtml(t.text));
    }
    byVerseNumber.set(verseNumber, byResource);
  }
  return byVerseNumber;
}

export async function fetchQuranJson(url) {
  return withRetry(url, () => requestJson(url));
}

/** Bir surenin Arapça kelime metinleri (kariden bağımsız, bir kez saklanır). */
export async function fetchArabicWords(surahId) {
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
        // Kaynakta tek tük görünmez yön işareti (RLM/LRM) geliyor —
        // 27:26'da secde işaretinden sonra bir U+200F var. Ekranda hiçbir
        // şey değiştirmiyor ama metin karşılaştırmalarını bozuyor.
        .map((w) => ({
          position: w.position,
          text: w.text_uthmani.replace(/[\u200e\u200f\u061c]/g, ""),
        })),
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
export async function fetchTimings(reciterId, surahId, wordsByVerse) {
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
export async function fetchContinuous(reciterId, surahId) {
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
  const trFetched = await mapLimit(trList, REQUEST_CONCURRENCY, async (t) => [
    t.id,
    await fetchJson(`${API_BASE}/surah/${id}?author=${t.source_id}`),
  ]);
  for (const [key, value] of trFetched) byTranslation.set(key, value);
  const raw = byTranslation.get(trList[0].id);

  // İngilizce mealler Quran.com'dan, ayet anahtarına göre eşlenmiş halde.
  const englishByVerse =
    enList.length > 0
      ? await fetchEnglishTranslations(
          enList.map((t) => t.source_id),
          id,
        )
      : new Map();

  const wordsByVerse = await fetchArabicWords(id);

  // Zaman damgaları yalnızca Quran.com karilerinde var.
  const timedReciters = reciters.filter((r) => r.sync === "word");

  const timingsByReciter = new Map();
  const timingsFetched = await mapLimit(
    timedReciters,
    REQUEST_CONCURRENCY,
    async (r) => [r.id, await fetchTimings(r.id, id, wordsByVerse)],
  );
  for (const [key, value] of timingsFetched) timingsByReciter.set(key, value);

  // Sürekli (tek dosya) tilavet. Kısmi bölümlerde anlamsız: Âmenerrasûlü
  // için dosya Bakara'nın tamamı olurdu.
  const continuousByReciter = new Map();
  const continuousAudio = {};
  if (!isPartial) {
    const fetched = await mapLimit(timedReciters, REQUEST_CONCURRENCY, async (r) => [
      r.id,
      await fetchContinuous(r.id, id),
    ]);
    for (const [reciterId, c] of fetched) {
      if (!c) {
        console.warn(`  uyarı: kari ${reciterId} için sürekli tilavet yok`);
        continue;
      }
      continuousByReciter.set(reciterId, c.byVerse);
      continuousAudio[reciterId] = c.url;
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
        : englishByVerse.get(verseNumber)?.get(t.source_id);
      if (text) out[t.id] = text;
    }
    return out;
  };

  const buildVerse = (raw2, verseNumber, isZero = false) => {
    const words = wordsByVerse.get(isZero ? 1 : verseNumber) ?? [];
    const timings = {};
    for (const r of timedReciters) {
      const t = timingsByReciter.get(r.id)?.get(verseNumber);
      if (t) timings[r.id] = t;
    }
    // Sürekli tilavetin mutlak zamanları (varsa).
    const ctimings = {};
    for (const r of timedReciters) {
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

/**
 * Bir bölümün tefsirini blok blok toplar.
 *
 * Tefsir ayet ayet değil, ayet gruplarına göre yazılıyor: 96:1 metni
 * 1-5. ayetleri birlikte kapsıyor. by_chapter ucu sureyi ayet ayet
 * döndürüyor ve metni yalnızca bloğun *ilk* ayetine koyuyor; sonraki
 * ayetler boş geliyor. Blok sınırı da tam olarak budur: bir metin, bir
 * sonraki dolu ayete kadar sürer.
 *
 * Not: by_ayah ucu kullanılmıyor. O uç `verses` alanında bloğun gerçek
 * aralığını değil sabit 10'luk bir pencere veriyor (74:11 sorgusunda
 * 11-20 diyor, oysa blok 11-30'u kapsıyor) ve aralık dışı bir ayet
 * sorulduğunda sessizce bir önceki bloğu döndürüyor. Bu yüzden eski
 * sürüm hem aralıkları yanlış etiketliyor hem aynı bloğu tekrar tekrar
 * kaydediyordu.
 */
export async function fetchTafsir(tafsirId, entry) {
  const first = entry.from ?? 1;
  const last = entry.to ?? entry.verse_count;

  let rows;
  try {
    rows = (
      await fetchQuranJson(
        `${QURAN_API}/tafsirs/${tafsirId}/by_chapter/${entry.surah}?per_page=300`,
      )
    ).tafsirs;
  } catch {
    console.warn(`  uyarı: tefsir alınamadı (sure ${entry.surah})`);
    return [];
  }

  // Ayet sırasına göre; gelen sıraya güvenmiyoruz.
  const byVerse = rows
    .map((r) => ({
      verse: Number(r.verse_key.split(":")[1]),
      text: sanitizeHtml(r.text ?? ""),
    }))
    .sort((a, b) => a.verse - b.verse);

  // Kaynak sureyi ayet ayet döndürdüğü için satır sayısı surenin gerçek
  // ayet sayısıdır. Kısmi bölümlerde (Âmenerrasûlü) entry.verse_count
  // bölümün uzunluğu olduğundan son bloğun bitişi buradan hesaplanmalı.
  const surahVerseCount = byVerse.length;
  if (surahVerseCount < last) {
    throw new Error(
      `Tefsir ayet sayısı yetersiz (sure ${entry.surah}): ` +
        `${surahVerseCount} < ${last}`,
    );
  }
  if (!entry.from && surahVerseCount !== entry.verse_count) {
    throw new Error(
      `Tefsir ayet sayısı tutmuyor (sure ${entry.surah}): ` +
        `${surahVerseCount} != ${entry.verse_count}`,
    );
  }

  // Dolu metinler blok başlangıcı; blok bir sonraki dolu ayetten önce biter.
  const starts = byVerse.filter((r) => r.text);
  const blocks = starts.map((r, i) => ({
    from: r.verse,
    to: (starts[i + 1]?.verse ?? surahVerseCount + 1) - 1,
    text: r.text,
  }));

  // Kısmi bölümlerde (Âmenerrasûlü) yalnızca kesişen bloklar gerekiyor.
  // Blok aralığı istenenin dışına taşabilir; kırpmıyoruz ama etiketi
  // gerçek kapsamıyla saklıyoruz ki okuyan yanılmasın.
  return blocks.filter((b) => b.to >= first && b.from <= last);
}

/** Tüm karileri, ses adresi öneki ve segment desteğiyle birlikte getirir. */
export async function fetchReciters() {
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
      sync: "word",
      audio_base: audioBaseFrom(file.url),
    });
  }
  return out;
}

/** Besmele (Fatiha 1:1) — her surenin 0. ayeti için. */
export async function fetchBismillah(reciters, translations) {
  const words = await fetchArabicWords(1);
  const timings = {};
  for (const r of reciters.filter((x) => x.sync === "word")) {
    const t = await fetchTimings(r.id, 1, words);
    const flat = t.get(1);
    if (flat) timings[r.id] = flat;
  }

  // İngilizce mealler besmeleyi Fatiha'nın 1. ayeti olarak veriyor.
  // Besmele: Fatiha 1:1 çevirisi.
  const enList = translations.filter((x) => x.lang === "en");
  const english = {};
  if (enList.length > 0) {
    const byVerse = await fetchEnglishTranslations(
      enList.map((t) => t.source_id),
      1,
    );
    for (const t of enList) {
      const text = byVerse.get(1)?.get(t.source_id);
      if (text) english[t.id] = text;
    }
  }
  // Ses adresi 0. ayet için verseAudioUrl tarafından 001001'e çevrildiğinden
  // burada tutulmasına gerek yok.
  return {
    arabic_words: (words.get(1) ?? []).map((w) => w.text),
    timings,
    english,
  };
}

/** Bölüm etiketi: "Sure 2" ya da "Sure 2 ayet 255-255". */
function entryLabel(entry) {
  return entry.from
    ? `Sure ${entry.surah} ayet ${entry.from}-${entry.to}`
    : `Sure ${entry.surah}`;
}

/**
 * Bir bölümü çekip dosyalarını yazar ve index'e girecek meta kaydını döner.
 * Meta kaydı ayrıca CACHE_DIR'a yazılır: çekim yarıda kalırsa (ağ, rate
 * limit, oturum) yeniden çalıştırıldığında tamamlananlar atlanır.
 */
async function fetchEntry(entry, ctx) {
  const { translations, reciters, bismillah, chapterMeta } = ctx;
  const surah = await fetchSurah(entry, translations, reciters, bismillah);
  const meta = chapterMeta.get(entry.surah);

  // Ayet verisi ayrı dosyaya: uygulama açılışta hepsini indirmesin,
  // sure açıldıkça insin ve service worker cache'lesin.
  await writeFile(
    path.join(DATA_DIR, `surah-${surah.id}.json`),
    JSON.stringify({ verses: surah.verses }),
    "utf-8",
  );

  for (const t of TAFSIRS) {
    const blocks = await fetchTafsir(t.source_id, {
      ...entry,
      verse_count: surah.verse_count,
    });
    if (blocks.length === 0) {
      console.warn(`  uyarı: ${t.name} tefsiri boş (${entryLabel(entry)})`);
      continue;
    }
    await writeFile(
      path.join(DATA_DIR, `tafsir-${t.id}-${surah.id}.json`),
      JSON.stringify({ blocks }),
      "utf-8",
    );
    console.log(`  tefsir ${t.name}: ${blocks.length} blok`);
  }

  const { verses: _drop, ...rest } = surah;
  const record = {
    ...rest,
    revelation_order: meta?.revelation_order ?? null,
    revelation_place: meta?.revelation_place ?? null,
    // Kısmi bölümlerde tefsir bloğu aralığın dışına taşabildiği için
    // hangi ayetleri kapsadığı ayrıca tutuluyor.
    range: entry.from ? [entry.from, entry.to] : null,
  };

  await writeFile(
    path.join(CACHE_DIR, `${surah.id}.json`),
    JSON.stringify(record),
    "utf-8",
  );
  return record;
}

/** Daha önce tamamlanmış bölümün meta kaydını okur; yoksa null. */
async function readCachedEntry(entryId) {
  try {
    const [meta, verses] = await Promise.all([
      readFile(path.join(CACHE_DIR, `${entryId}.json`), "utf-8"),
      readFile(path.join(DATA_DIR, `surah-${entryId}.json`), "utf-8"),
    ]);
    // Ayet dosyası yarım yazılmışsa (disk dolu, süreç öldü) JSON.parse
    // patlar ve bölüm yeniden çekilir.
    JSON.parse(verses);
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const onlyArg = args[args.indexOf("--only") + 1];
  const only =
    args.includes("--only") && onlyArg
      ? new Set(onlyArg.split(",").map((x) => x.trim()))
      : null;

  console.log("Meal listesi alınıyor...");
  const translations = await fetchTranslations();
  console.log(`Kullanılacak meal: ${translations.length}`);

  console.log("Kari listesi ve segment desteği kontrol ediliyor...");
  const reciters = await fetchReciters();
  console.log(`Kullanılabilir kari: ${reciters.length}`);

  console.log("Sure meta bilgileri (nüzûl sırası) alınıyor...");
  const { chapters } = await fetchQuranJson(`${QURAN_API}/chapters`);
  const chapterMeta = new Map(chapters.map((c) => [c.id, c]));

  console.log("Besmele kaydı alınıyor...");
  const bismillah = await fetchBismillah(reciters, translations);

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  const ctx = { translations, reciters, bismillah, chapterMeta };
  const entries = [];
  const failed = [];

  for (const [i, entry] of ENTRIES.entries()) {
    const entryId = String(entry.id ?? entry.surah);
    if (only && !only.has(entryId)) continue;

    const progress = `[${i + 1}/${ENTRIES.length}]`;
    if (!force) {
      const cached = await readCachedEntry(entryId);
      if (cached) {
        entries.push(cached);
        console.log(`${progress} ${entryLabel(entry)} — zaten çekilmiş, atlandı`);
        continue;
      }
    }

    console.log(`${progress} ${entryLabel(entry)} çekiliyor...`);
    try {
      entries.push(await fetchEntry(entry, ctx));
    } catch (err) {
      // Tek bir bölüm yüzünden saatlerce süren çekim çöpe gitmesin:
      // hatayı not edip devam ediyoruz, sonunda özet basılıyor ve
      // script hata koduyla çıkıyor.
      console.error(`${progress} HATA: ${entryLabel(entry)} — ${err.message}`);
      failed.push(entryLabel(entry));
    }
  }

  // --only ile çalışıldığında index'in geri kalanı kaybolmasın diye
  // dokunulmayan bölümler cache'ten tamamlanıyor.
  if (only) {
    for (const entry of ENTRIES) {
      const entryId = String(entry.id ?? entry.surah);
      if (only.has(entryId)) continue;
      const cached = await readCachedEntry(entryId);
      if (cached) entries.push(cached);
    }
    // Cache'ten gelenler sona eklendiği için ENTRIES sırasına geri alıyoruz.
    const order = new Map(
      ENTRIES.map((e, i) => [String(e.id ?? e.surah), i]),
    );
    entries.sort(
      (a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0),
    );
  }

  const index = {
    translations,
    default_translation_id: DEFAULT_TRANSLATION_ID,
    reciters,
    default_reciter_id: DEFAULT_RECITER_ID,
    tafsirs: TAFSIRS.map(({ source_id: _s, ...t }) => t),
    // Sure dosyaları public/ altında olduğu için isimleri hash'lenmiyor;
    // sürüm numarası cache'i tazelemek için sorgu dizesine ekleniyor.
    data_version: Date.now().toString(36),
    fetched_at: new Date().toISOString(),
    entries,
  };

  await writeFile(INDEX_FILE, JSON.stringify(index), "utf-8");
  console.log(`\nKaydedildi:`);
  console.log(`  ${INDEX_FILE}`);
  console.log(`  ${DATA_DIR}/surah-*.json (${entries.length} bölüm)`);

  if (failed.length > 0) {
    console.error(`\nÇekilemeyen bölümler (${failed.length}):`);
    for (const f of failed) console.error(`  ${f}`);
    process.exitCode = 1;
  }
}

// Bu dosya scripts/fetch-fallback-items.mjs tarafından fonksiyonlarını
// yeniden kullanmak için import ediliyor; import edilince main()
// çalışmasın, yalnızca doğrudan "node fetch-surahs.mjs" ile çalıştırılınca
// çalışsın.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
