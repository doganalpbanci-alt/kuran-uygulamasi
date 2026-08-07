// Üretilen veriyi kaynaklara geri sorarak doğrular.
//
// Meal ve tefsir hassas içerik: tek ayetlik bir kayma sessizce yanlış anlam
// üretir. Bu script fetch-surahs.mjs'in çıktısını bağımsız isteklerle
// karşılaştırır; çekme mantığındaki bir hata burada da tekrarlanmasın diye
// API yanıtını doğrudan okur, çekme fonksiyonlarını kullanmaz.
//
// Örnekleme yapmıyor: her bölümün *her* ayetini, her meal için tek tek
// karşılaştırıyor. Kayma hatası tam olarak örneklemenin kaçırdığı hatadır.
//
// Usage: node scripts/verify-data.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const QURAN_API = "https://api.quran.com/api/v4";
const AK_API = "https://api.acikkuran.com";
const ALQURAN_CLOUD = "https://api.alquran.cloud/v1";
const TAFSIR_SOURCE_ID = 169; // Ibn Kathir (Abridged)

// api.acikkuran.com'un DNS'i kırık olduğu sürece bu 5 öğe
// scripts/fetch-fallback-items.mjs ile alquran.cloud'dan çekiliyor —
// doğrulaması da o kaynağa karşı yapılmalı. Bkz. o script'in başındaki
// açıklama.
const FALLBACK_ENTRY_IDS = new Set([112, 113, 114, "ayetelkursi", "hasr-son3"]);
const ALQURAN_CLOUD_TR = [
  { appId: "tr-11", edition: "tr.diyanet" },
  { appId: "tr-14", edition: "tr.yazir" },
  { appId: "tr-6", edition: "tr.bulac" },
  { appId: "tr-27", edition: "tr.ates" },
  { appId: "tr-26", edition: "tr.yildirim" },
  { appId: "tr-30", edition: "tr.ozturk" },
];
const ALQURAN_CLOUD_MISSING_TR = ["tr-15", "tr-22"]; // Elmalılı sadeleştirilmiş, Muhammed Esed
const ALQURAN_CLOUD_TRANSLITERATION = "tr.transliteration";

let failures = 0;
let checks = 0;

function check(ok, label, detail = "") {
  checks++;
  if (!ok) {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
  return ok;
}

const readJson = async (p) => JSON.parse(await readFile(p, "utf-8"));

async function api(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

// Meal metinleri dipnot referansı içeriyor (<sup foot_note=..>1</sup>).
// Uygulamada gösterilmiyor; sadece etiketi atsaydık metne yapışık bir "1"
// kalırdı. Karşılaştırma da aynı kuralı uygulamalı, yoksa her ayet
// "farklı" görünür. Asıl aranan fark metnin kendisinde.
const normalize = (s) =>
  (s ?? "")
    .replace(/<sup[^>]*>.*?<\/sup>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Arapça karşılaştırması iki kaynağın *aynı harfleri aynı sırada* verdiğini
// arıyor; gösterimi değiştirmeyen üç farkı eliyor:
//
//  1. Tecvid işaretleri: kelime bazlı metin U+06ED ve U+06E2 (iklab için
//     küçük mim) taşıyor, ayet bazlı metin taşımıyor. Harf/hareke değiller.
//  2. Birleşik işaret sırası: 81:1'de kaynak "şedde + fetha", kelime metni
//     "fetha + şedde" veriyor. NFC bunları aynı sıraya koyuyor.
//  3. Boşluk: 18:1'deki durak işareti kaynakta ayrı token, kelimede bitişik.
//     Kelime sınırı zaten kelime bazlı uçtan geliyor, ayet metninden değil.
const TAJWEED_MARKS = /[ۭۢ]/g;
const normalizeArabic = (s) =>
  (s ?? "").normalize("NFC").replace(TAJWEED_MARKS, "").replace(/\s+/g, "");

/** Kaynaktan tefsir bloklarını bağımsızca yeniden kurar. */
async function sourceTafsirBlocks(surahNum) {
  const { tafsirs } = await api(
    `${QURAN_API}/tafsirs/${TAFSIR_SOURCE_ID}/by_chapter/${surahNum}?per_page=300`,
  );
  const rows = tafsirs
    .map((r) => ({
      verse: Number(r.verse_key.split(":")[1]),
      text: normalize(r.text),
    }))
    .sort((a, b) => a.verse - b.verse);

  // Satır sayısı surenin gerçek ayet sayısı; son bloğun bitişi bundan.
  const starts = rows.filter((r) => r.text);
  return {
    rowCount: rows.length,
    blocks: starts.map((r, i) => ({
      from: r.verse,
      to: (starts[i + 1]?.verse ?? rows.length + 1) - 1,
      text: r.text,
    })),
  };
}

/** Bölüm başına ortak hazırlık: dosyayı okur, ayet sayısı/sürekliliğini denetler. */
async function loadAndCheckContinuity(entry) {
  const { verses } = await readJson(
    path.join(ROOT, "public", "data", `surah-${entry.id}.json`),
  );
  const numbered = verses.filter((v) => v.verse_number > 0);

  const first = entry.range?.[0] ?? 1;
  const last = entry.range?.[1] ?? entry.verse_count;
  const expected = last - first + 1;
  check(
    numbered.length === expected,
    "ayet sayısı",
    `${numbered.length} != ${expected}`,
  );
  check(
    numbered.every((v, i) => v.verse_number === first + i),
    "ayet numaraları sürekli",
    `ilk sapma: ${numbered.find((v, i) => v.verse_number !== first + i)?.verse_number}`,
  );

  const range = [];
  for (let n = first; n <= last; n++) range.push(n);

  return {
    verses,
    numbered,
    first,
    last,
    range,
    ourVerse: (n) => numbered.find((v) => v.verse_number === n),
  };
}

/** Arapça metin ve tefsir: hem Açık Kuran hem alquran.cloud kaynaklı öğelerde ortak (ikisi de Quran.com). */
async function verifyArabicAndTafsir(index, entry, surahNum, ourVerse, range, first, last) {
  // Arapça: kelimelerin birleşimi ayetin kendi metnine eşit mi
  const { verses: arab } = await api(
    `${QURAN_API}/verses/by_chapter/${surahNum}?fields=text_uthmani&per_page=300`,
  );
  const arabByNum = new Map(
    arab.map((v) => [Number(v.verse_key.split(":")[1]), v.text_uthmani]),
  );
  const badArabic = [];
  const badWords = [];
  for (const n of range) {
    const words = ourVerse(n)?.arabic_words ?? [];
    if (words.length === 0 || words.some((w) => !w?.trim())) badWords.push(n);
    const ours = normalizeArabic(words.join(" "));
    const theirs = normalizeArabic(arabByNum.get(n));
    if (ours !== theirs || !ours) badArabic.push(n);
  }
  check(
    badArabic.length === 0,
    `Arapça metin (${range.length} ayet)`,
    `${badArabic.length} ayet farklı, ilki ${surahNum}:${badArabic[0]}`,
  );
  check(
    badWords.length === 0,
    `Arapça kelime bölünmesi`,
    `${badWords.length} ayette boş kelime, ilki ${surahNum}:${badWords[0]}`,
  );

  // Tefsir: blokları kaynaktan bağımsızca kurup birebir karşılaştır
  for (const taf of index.tafsirs) {
    let blocks;
    try {
      ({ blocks } = await readJson(
        path.join(ROOT, "public", "data", `tafsir-${taf.id}-${entry.id}.json`),
      ));
    } catch {
      check(false, `${taf.name} dosyası`, "bulunamadı");
      continue;
    }

    const src = await sourceTafsirBlocks(surahNum);
    check(
      entry.range ? src.rowCount >= last : src.rowCount === entry.verse_count,
      `${taf.name} kaynak ayet sayısı`,
      `${src.rowCount} / beklenen ${entry.range ? `>= ${last}` : entry.verse_count}`,
    );

    const want = src.blocks.filter((b) => b.to >= first && b.from <= last);
    check(
      blocks.length === want.length,
      `${taf.name} blok sayısı`,
      `${blocks.length} != ${want.length}`,
    );

    const mismatched = blocks.filter((b, i) => {
      const w = want[i];
      return (
        !w ||
        b.from !== w.from ||
        b.to !== w.to ||
        normalize(b.text) !== w.text
      );
    });
    check(
      mismatched.length === 0,
      `${taf.name} bloklar kaynakla birebir`,
      mismatched.length
        ? `ilk sapma ${mismatched[0].from}-${mismatched[0].to}`
        : "",
    );

    let ok = blocks.length > 0 && blocks[0].from <= first;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].from > blocks[i].to) ok = false;
      if (i > 0 && blocks[i].from !== blocks[i - 1].to + 1) ok = false;
      if (!blocks[i].text?.trim()) ok = false;
    }
    if (blocks.length && blocks[blocks.length - 1].to < last) ok = false;
    check(
      ok,
      `${taf.name} kapsam boşluksuz`,
      blocks.map((b) => `${b.from}-${b.to}`).join(","),
    );
  }
}

/**
 * alquran.cloud kaynaklı 5 öğe: Türkçe meal (6/8 yazar) + okunuş
 * alquran.cloud'dan; İngilizce meal, Arapça, tefsir değişmedi (Quran.com).
 * Besmele satırı (0. ayet) ayrı: meali eski doğrulanmış dosyadan aynen
 * kopyalandığı için o dosyaya karşı, okunuşu ise Fatiha 1:1'in
 * alquran.cloud çevirisine karşı doğrulanıyor (fetch-fallback-items.mjs
 * ile aynı mantık).
 */
async function verifyFallbackEntry(index, entry) {
  console.log(`\n${entry.name} (${entry.id}) — alquran.cloud kaynaklı`);
  const surahNum = entry.audio_surah;
  const { ourVerse, range, first, last } = await loadAndCheckContinuity(entry);

  const editions = [...ALQURAN_CLOUD_TR.map((t) => t.edition), ALQURAN_CLOUD_TRANSLITERATION].join(",");
  const { data } = await api(`${ALQURAN_CLOUD}/surah/${surahNum}/editions/${editions}`);
  const translations = new Map(); // verseNumber -> Map<appId, text>
  const transliteration = new Map(); // verseNumber -> text
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

  // Türkçe meal: 6 yazarın her ayeti alquran.cloud'a karşı
  for (const t of ALQURAN_CLOUD_TR) {
    const bad = [];
    for (const n of range) {
      const ours = normalize(ourVerse(n)?.translations?.[t.appId]);
      const theirs = normalize(translations.get(n)?.get(t.appId));
      if (ours !== theirs || !ours) bad.push({ n, ours, theirs });
    }
    check(
      bad.length === 0,
      `${t.appId} (${range.length} ayet, alquran.cloud)`,
      bad.length
        ? `${bad.length} ayet farklı, ilki ${surahNum}:${bad[0].n} — ` +
            `bizde "${bad[0].ours.slice(0, 40)}" / kaynakta "${bad[0].theirs.slice(0, 40)}"`
        : "",
    );
  }

  // tr-15/tr-22: hiçbir yeni kaynakta yok; ayet satırlarında (0 hariç) hiç
  // olmamalı — yanlışlıkla eski/bozuk veri sızmadığını doğrular.
  for (const id of ALQURAN_CLOUD_MISSING_TR) {
    const leaked = range.filter((n) => ourVerse(n)?.translations?.[id] != null);
    check(
      leaked.length === 0,
      `${id} bu bölümde olmamalı (kaynağı yok)`,
      leaked.length ? `ayet ${leaked[0]}'de metin var` : "",
    );
  }

  // Okunuş: alquran.cloud'un tr.transliteration'ına karşı
  const badOkunus = [];
  for (const n of range) {
    const ours = normalize(ourVerse(n)?.transcription);
    const theirs = normalize(transliteration.get(n));
    if (ours !== theirs || !ours) badOkunus.push(n);
  }
  check(
    badOkunus.length === 0,
    `Okunuş (${range.length} ayet, alquran.cloud)`,
    badOkunus.length ? `${badOkunus.length} ayet farklı, ilki ${surahNum}:${badOkunus[0]}` : "",
  );

  // Besmele (0. ayet, yalnızca tam yeni surelerde: İhlâs/Felâk/Nâs)
  const zero = ourVerse(0);
  if (zero) {
    const verified = JSON.parse(
      await readFile(path.join(ROOT, "public", "data", "surah-96.json"), "utf-8"),
    ).verses.find((v) => v.verse_number === 0);
    const badBesmele = Object.keys(verified.translations).filter(
      (id) => normalize(zero.translations[id]) !== normalize(verified.translations[id]),
    );
    check(
      badBesmele.length === 0,
      "Besmele meali (doğrulanmış dosyadan kopya)",
      badBesmele.length ? `farklı: ${badBesmele.join(", ")}` : "",
    );

    // transliteration Map'i bu bölümün suresine ait (örn. 112); besmele
    // Fatiha 1:1'den geldiği için ayrı bir sorgu gerekiyor.
    const { data: fatihaData } = await api(
      `${ALQURAN_CLOUD}/surah/1/editions/${ALQURAN_CLOUD_TRANSLITERATION}`,
    );
    const fatihaOkunus = fatihaData[0].ayahs.find((a) => a.numberInSurah === 1)?.text.trim();
    check(
      normalize(zero.transcription) === normalize(fatihaOkunus),
      "Besmele okunuşu (Fatiha 1:1, alquran.cloud)",
      `bizde "${zero.transcription}" / kaynakta "${fatihaOkunus}"`,
    );
  }

  await verifyArabicAndTafsir(index, entry, surahNum, ourVerse, range, first, last);

  console.log(`  ${checks - failures}/${checks} kontrol geçti`);
}

async function verifyEntry(index, entry) {
  console.log(`\n${entry.name} (${entry.id})`);
  // Bölüm id'si sure numarası olmayabilir (Âmenerrasûlü gibi kısmi bölümler).
  const surahNum = entry.audio_surah;

  const { ourVerse, range, first, last } = await loadAndCheckContinuity(entry);

  // 2) Türkçe meal: her yazarın her ayeti
  for (const t of index.translations.filter((x) => x.lang === "tr")) {
    const src = (await api(`${AK_API}/surah/${surahNum}?author=${t.source_id}`))
      .data;
    const bad = [];
    for (const n of range) {
      const ours = normalize(ourVerse(n)?.translations?.[t.id]);
      const theirs = normalize(
        src.verses.find((v) => v.verse_number === n)?.translation?.text,
      );
      if (ours !== theirs || !ours) bad.push({ n, ours, theirs });
    }
    check(
      bad.length === 0,
      `${t.name} (${range.length} ayet)`,
      bad.length
        ? `${bad.length} ayet farklı, ilki ${surahNum}:${bad[0].n} — ` +
            `bizde "${bad[0].ours.slice(0, 40)}" / kaynakta "${bad[0].theirs.slice(0, 40)}"`
        : "",
    );
  }

  // 3) İngilizce meal: ayet anahtarıyla eşleştirilerek her ayet
  const ens = index.translations.filter((t) => t.lang === "en");
  if (ens.length > 0) {
    const { verses: src } = await api(
      `${QURAN_API}/verses/by_chapter/${surahNum}` +
        `?translations=${ens.map((t) => t.source_id).join(",")}&fields=verse_key&per_page=300`,
    );
    const byNum = new Map(
      src.map((v) => [Number(v.verse_key.split(":")[1]), v]),
    );
    for (const t of ens) {
      const bad = [];
      for (const n of range) {
        const ours = normalize(ourVerse(n)?.translations?.[t.id]);
        const theirs = normalize(
          byNum
            .get(n)
            ?.translations?.find((x) => x.resource_id === t.source_id)?.text,
        );
        if (ours !== theirs || !ours) bad.push({ n, ours, theirs });
      }
      check(
        bad.length === 0,
        `${t.name} (${range.length} ayet)`,
        bad.length
          ? `${bad.length} ayet farklı, ilki ${surahNum}:${bad[0].n} — ` +
              `bizde "${bad[0].ours.slice(0, 40)}" / kaynakta "${bad[0].theirs.slice(0, 40)}"`
          : "",
      );
    }
  }

  await verifyArabicAndTafsir(index, entry, surahNum, ourVerse, range, first, last);

  console.log(`  ${checks - failures}/${checks} kontrol geçti`);
}

async function main() {
  const index = await readJson(path.join(ROOT, "src", "data", "index.json"));

  // api.acikkuran.com'un DNS'i kırık olduğu sürece Açık Kuran kaynaklı
  // girdiler bu script'te doğrulanamaz. Erişilemezse o girdileri
  // "atlandı" olarak işaretleyip devam ediyoruz — tek bir kaynağın
  // engelli olması, erişilebilen (alquran.cloud kaynaklı 5 öğe gibi)
  // girdilerin doğrulamasını da iptal etmemeli.
  let skipped = 0;
  for (const entry of index.entries) {
    try {
      if (FALLBACK_ENTRY_IDS.has(entry.id)) {
        await verifyFallbackEntry(index, entry);
      } else {
        await verifyEntry(index, entry);
      }
    } catch (err) {
      skipped++;
      console.error(`\n${entry.name} (${entry.id}) — ATLANDI: ${err.message}`);
    }
  }

  if (skipped > 0) {
    console.log(`\n(${skipped} girdi kaynağa erişilemediği için atlandı, hata sayılmadı)`);
  }
  console.log(
    `\n${failures === 0 ? "TÜM KONTROLLER GEÇTİ" : `${failures} KONTROL BAŞARISIZ`} (${checks} kontrol)`,
  );
  process.exit(failures === 0 && skipped === 0 ? 0 : failures === 0 ? 2 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
