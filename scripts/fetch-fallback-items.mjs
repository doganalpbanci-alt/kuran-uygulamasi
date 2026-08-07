// Build-time script — yalnızca api.acikkuran.com'a bağımlı olmadan
// çekilebilen "Günlük Okumalar" Kur'an öğeleri için (İhlâs, Felâk, Nâs,
// Âyetü'l-Kürsî, Haşr suresi son 3 âyet).
//
// Neden ayrı bir script: api.acikkuran.com'un DNS kaydı kırık
// (doğrulandı: Google'ın herkese açık DNS sunucusu bu alan adı için
// NXDOMAIN döndürüyor — sandbox'a özgü bir engel değil, gerçek ve
// süresi belirsiz bir kesinti). Normal scripts/fetch-surahs.mjs Türkçe
// meal ve okunuşu Açık Kuran'dan çektiği için bu durumda TÜM bölümler
// (yeni + mevcut 16) için başarısız olurdu.
//
// Bu script yalnızca YUKARIDAKİ 5 öğe için, Açık Kuran'dan bağımsız iki
// kaynak kullanır:
//   - Türkçe meal + okunuş: api.alquran.cloud (bağımsız, üçüncü bir
//     API; mevcut 8 Türkçe mealden 6'sını karşılıyor — Elmalılı
//     (sadeleştirilmiş) ve Muhammed Esed hiçbir yeni kaynakta yok,
//     bilinçli olarak bu 5 öğede eksik bırakılıyor; UI boş metin yerine
//     "bu meal bu bölüm için henüz eklenmedi" notu gösteriyor).
//   - Arapça metin, kelime zaman damgaları, tefsir, İngilizce meal:
//     Quran.com — DEĞİŞMEDİ, fetch-surahs.mjs'teki AYNI, zaten
//     doğrulanmış fonksiyonlar buradan import edilip tekrar kullanılıyor.
//
// Mevcut 16 bölüme DOKUNMAZ — yalnızca index.json'a bu 5 girdiyi ekler.
// Açık Kuran düzelince bu 5 öğe normal scripts/fetch-surahs.mjs ile
// yeniden çekilip tam kaynağa (8 meal + Açık Kuran okunuşu) dönebilir.
//
// Usage: node scripts/fetch-fallback-items.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  INDEX_FILE,
  DATA_DIR,
  TAFSIRS,
  EN_TRANSLATION_IDS,
  fetchQuranJson,
  fetchArabicWords,
  fetchTimings,
  fetchContinuous,
  fetchTafsir,
  fetchReciters,
  fetchBismillah,
  fetchEnglishTranslations,
} from "./fetch-surahs.mjs";

const ALQURAN_CLOUD = "https://api.alquran.cloud/v1";

// app'teki tr-<id> ile alquran.cloud'un edition identifier'ı eşleşmesi.
// tr-15 (Elmalılı sadeleştirilmiş) ve tr-22 (Muhammed Esed) hiçbir yeni
// kaynakta yok; bilinçli olarak listede değil.
const ALQURAN_CLOUD_TR = [
  { appId: "tr-11", edition: "tr.diyanet" },
  { appId: "tr-14", edition: "tr.yazir" },
  { appId: "tr-6", edition: "tr.bulac" },
  { appId: "tr-27", edition: "tr.ates" },
  { appId: "tr-26", edition: "tr.yildirim" },
  { appId: "tr-30", edition: "tr.ozturk" },
];
const ALQURAN_CLOUD_TRANSLITERATION = "tr.transliteration";

// Yeni girdiler. Her biri normal ENTRIES formatındaki gibi.
//
// name/subtitle elle veriliyor: quran.com'un /chapters ucu yalnızca
// İngilizce isim veriyor (name_simple: "Al-Ikhlas"), Açık Kuran'ın
// Türkçe name_translation_tr alanının karşılığı yok. Diğer bölümlerin
// subtitle'ı da aynı desende (surenin Arapça adının Türkçe anlamı).
const ENTRIES = [
  { surah: 112, id: 112, name: "İhlâs", subtitle: "Halis Kılma" },
  { surah: 113, id: 113, name: "Felâk", subtitle: "Şafak" },
  { surah: 114, id: 114, name: "Nâs", subtitle: "İnsanlar" },
  {
    surah: 2,
    from: 255,
    to: 255,
    id: "ayetelkursi",
    name: "Âyetü'l-Kürsî",
    subtitle: "Bakara suresi 255",
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

async function fetchAlquranCloud(surahNum) {
  const editions = [
    ...ALQURAN_CLOUD_TR.map((t) => t.edition),
    ALQURAN_CLOUD_TRANSLITERATION,
  ].join(",");
  const res = await fetch(`${ALQURAN_CLOUD}/surah/${surahNum}/editions/${editions}`);
  if (!res.ok) {
    throw new Error(`alquran.cloud isteği başarısız: sure ${surahNum} (${res.status})`);
  }
  const { data } = await res.json();

  // translations: Map<verseNumber, Map<appId, text>>
  const translations = new Map();
  // transliteration: Map<verseNumber, text>
  const transliteration = new Map();

  for (const edition of data) {
    const id = edition.edition.identifier;
    const trMatch = ALQURAN_CLOUD_TR.find((t) => t.edition === id);
    for (const ayah of edition.ayahs) {
      const n = ayah.numberInSurah;
      if (trMatch) {
        if (!translations.has(n)) translations.set(n, new Map());
        translations.get(n).set(trMatch.appId, ayah.text.trim());
      } else if (id === ALQURAN_CLOUD_TRANSLITERATION) {
        transliteration.set(n, ayah.text.trim());
      }
    }
  }
  return { translations, transliteration };
}

/**
 * Besmele metni sabittir (hangi sureden önce geldiği anlamı değiştirmez).
 * Meal: daha önce Açık Kuran çalışırken çekilmiş, doğrulanmış bir
 * dosyadan aynen kopyalanıyor — bu da tüm 8 meali (tr-15/tr-22 dahil)
 * kapsıyor, çünkü meal metninde stil tutarlılığı diye bir sorun yok.
 *
 * Okunuş ise farklı: alquran.cloud'un "Çeviriyazı" biçimi (aksanlı,
 * örn. "ḳul hüve-llâhü eḥad") Açık Kuran'ın sade biçiminden (örn.
 * "Bismillahir rahmanir rahim") görünüş olarak farklı. Besmelenin
 * okunuşunu eski dosyadan alırsak aynı surenin 0. ayeti sade, 1.
 * ayetinden itibaren aksanlı görünür — bu yüzden okunuş da
 * alquran.cloud'dan (Fatiha 1:1, besmelenin kendisi) taze çekiliyor.
 */
async function loadVerifiedBesmele() {
  const raw = await readFile(path.join(DATA_DIR, "surah-96.json"), "utf-8");
  const zero = JSON.parse(raw).verses.find((v) => v.verse_number === 0);
  if (!zero) throw new Error("surah-96.json içinde besmele (verse_number 0) bulunamadı");

  const fatiha = await fetchAlquranCloud(1);
  const transcription = fatiha.transliteration.get(1);
  if (!transcription) throw new Error("alquran.cloud'dan besmele okunuşu alınamadı (Fatiha 1:1)");

  return { translations: zero.translations, transcription };
}

async function buildEntry(entry, reciters, bismillah, verifiedBesmele) {
  const id = entry.surah;
  const isPartial = entry.from != null;
  const isFullNewSurah = !isPartial; // 112/113/114

  const [wordsByVerse, alquran, englishByVerse, chapterInfo] = await Promise.all([
    fetchArabicWords(id),
    fetchAlquranCloud(id),
    fetchEnglishTranslations(EN_TRANSLATION_IDS, id),
    fetchQuranJson(`https://api.quran.com/api/v4/chapters/${id}`),
  ]);
  const verseCount = chapterInfo.chapter.verses_count;

  const timedReciters = reciters.filter((r) => r.sync === "word");
  const timingsByReciter = new Map();
  for (const r of timedReciters) {
    timingsByReciter.set(r.id, await fetchTimings(r.id, id, wordsByVerse));
  }

  const continuousByReciter = new Map();
  const continuousAudio = {};
  if (!isPartial) {
    for (const r of timedReciters) {
      const c = await fetchContinuous(r.id, id);
      if (!c) continue;
      continuousByReciter.set(r.id, c.byVerse);
      continuousAudio[r.id] = c.url;
    }
  }

  const buildVerse = (verseNumber) => {
    const words = wordsByVerse.get(verseNumber) ?? [];
    const timings = {};
    for (const r of timedReciters) {
      const t = timingsByReciter.get(r.id)?.get(verseNumber);
      if (t) timings[r.id] = t;
    }
    const ctimings = {};
    for (const r of timedReciters) {
      const c = continuousByReciter.get(r.id)?.get(verseNumber);
      if (c) ctimings[r.id] = c;
    }

    const translations = {};
    for (const [appId, text] of alquran.translations.get(verseNumber) ?? []) {
      translations[appId] = text;
    }
    for (const [resourceId, text] of englishByVerse.get(verseNumber) ?? []) {
      // englishByVerse Map<verseNumber, Map<resourceId, text>> — resourceId'yi
      // en-<id> biçimine çevir.
      translations[`en-${resourceId}`] = text;
    }

    return {
      verse_number: verseNumber,
      transcription: alquran.transliteration.get(verseNumber) ?? "",
      translations,
      arabic_words: words.map((w) => w.text),
      timings,
      ctimings,
      start_time: null,
    };
  };

  const verses = [];
  if (isFullNewSurah) {
    verses.push({
      verse_number: 0,
      transcription: verifiedBesmele.transcription,
      translations: {
        ...verifiedBesmele.translations,
        // Fatiha 1:1'den gelen İngilizce besmele (quran.com, değişmedi).
        ...bismillah.english,
      },
      arabic_words: bismillah.arabic_words,
      timings: bismillah.timings,
      ctimings: {},
      start_time: null,
    });
  }
  const first = entry.from ?? 1;
  const last = entry.to ?? verseCount;
  for (let n = first; n <= last; n++) {
    verses.push(buildVerse(n));
  }

  const missing = verses.filter((v) => !v.arabic_words?.length).length;
  if (missing > 0) {
    console.warn(`  uyarı: ${missing} ayette Arapça kelime bulunamadı`);
  }

  return {
    id: entry.id,
    audio_surah: id,
    name: entry.name ?? chapterInfo.chapter.name_simple,
    subtitle: entry.subtitle ?? chapterInfo.chapter.translated_name?.name ?? null,
    verse_count: verses.filter((v) => v.verse_number > 0).length,
    // Türkçe meal sesi Açık Kuran'dan geliyordu; alternatif kaynakta yok.
    // Açık Kuran düzelip normal script'le yeniden çekilince eklenecek.
    audio: null,
    continuous_audio: continuousAudio,
    verses,
    revelation_order: chapterInfo.chapter.revelation_order ?? null,
    revelation_place: chapterInfo.chapter.revelation_place ?? null,
    range: entry.from ? [entry.from, entry.to] : null,
  };
}

async function main() {
  console.log("Kari listesi alınıyor...");
  const reciters = await fetchReciters();

  console.log("Besmele (Arapça + İngilizce, Quran.com) alınıyor...");
  const bismillah = await fetchBismillah(reciters, [
    { id: "en-20", source_id: 20, lang: "en" },
    { id: "en-85", source_id: 85, lang: "en" },
    { id: "en-19", source_id: 19, lang: "en" },
    { id: "en-22", source_id: 22, lang: "en" },
  ]);

  console.log("Doğrulanmış besmele (Türkçe meal + okunuş) mevcut dosyadan okunuyor...");
  const verifiedBesmele = await loadVerifiedBesmele();

  const index = JSON.parse(await readFile(INDEX_FILE, "utf-8"));
  const newEntries = [];

  for (const entry of ENTRIES) {
    const label = entry.from
      ? `Sure ${entry.surah} ayet ${entry.from}-${entry.to}`
      : `Sure ${entry.surah}`;
    console.log(`${label} çekiliyor (alquran.cloud + quran.com)...`);

    const built = await buildEntry(entry, reciters, bismillah, verifiedBesmele);

    await writeFile(
      path.join(DATA_DIR, `surah-${built.id}.json`),
      JSON.stringify({ verses: built.verses }),
      "utf-8",
    );

    for (const t of TAFSIRS) {
      console.log(`  tefsir: ${t.name}`);
      const blocks = await fetchTafsir(t.source_id, {
        ...entry,
        verse_count: built.verse_count,
      });
      if (blocks.length === 0) continue;
      await writeFile(
        path.join(DATA_DIR, `tafsir-${t.id}-${built.id}.json`),
        JSON.stringify({ blocks }),
        "utf-8",
      );
      console.log(`    ${blocks.length} blok`);
    }

    const { verses: _drop, ...rest } = built;
    newEntries.push(rest);
  }

  // Mevcut 16 bölüme dokunmadan, yalnızca bu 5'i ekle/güncelle.
  const existingIds = new Set(index.entries.map((e) => String(e.id)));
  const withoutNew = index.entries.filter(
    (e) => !newEntries.some((n) => String(n.id) === String(e.id)),
  );
  index.entries = [...withoutNew, ...newEntries];
  index.data_version = Date.now().toString(36);
  index.fetched_at = new Date().toISOString();

  await writeFile(INDEX_FILE, JSON.stringify(index), "utf-8");
  console.log(`\nKaydedildi: ${newEntries.length} öğe (${INDEX_FILE})`);
  for (const n of newEntries) {
    const already = existingIds.has(String(n.id)) ? " (güncellendi)" : " (yeni)";
    console.log(`  - ${n.id}: ${n.name}${already}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
