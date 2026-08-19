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
// Açık Kuran'ın yeni adresi; api.acikkuran.com'un DNS kaydı kalktı.
const AK_API = "https://api.quran.so";
const TAFSIR_SOURCE_ID = 169; // Ibn Kathir (Abridged)

/**
 * Kaynağın kendisinde boş olan tefsirler. quran.com'daki İbn Kesir
 * (id 169) Fil suresinin beş ayetini de boş döndürüyor; uygulama o
 * bölümde "tefsir bulunamadı" diyor. Veri hatası değil, kaynak eksiği —
 * dosyanın yokluğu bu bölümde beklenen durumdur.
 */
const KNOWN_EMPTY_TAFSIR = new Set(["en-ibn-kathir:105"]);

// Bir bölüm içinde aynı anda uçan istek sayısı. 117 bölüm × 8 Türkçe meal
// sırayla gidince doğrulama yarım saati aşıyor.
const REQUEST_CONCURRENCY = 4;

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
  (s ?? "")
    .normalize("NFC")
    .replace(TAJWEED_MARKS, "")
    // Görünmez yön işaretleri (RLM/LRM/ALM): kaynakta tek tük geliyor,
    // ekranda hiçbir şey değiştirmiyor.
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/\s+/g, "");

/**
 * quran.com'un kendi iki ucu bu iki ayette elifi farklı yazıyor:
 * kelime bazlı uç 11:13'te "افْتَرَاهُ", 80:25'te "اَنَّا" derken, ayet
 * bazlı uç "ٱفْتَرَىٰهُ" ve "أَنَّا" veriyor. Aynı kelime, farklı imla —
 * harf/anlam farkı değil, kaynağın kendi içindeki tutarsızlık.
 * Uygulama kelime bazlı metni gösteriyor (kelime imleci için gerekli).
 *
 * Liste bilinçli olarak dar: bu iki ayet dışında herhangi bir Arapça
 * farkı hâlâ hata sayılır.
 */
const KNOWN_ARABIC_VARIANTS = new Set(["11:13", "80:25"]);

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
    if ((ours !== theirs || !ours) && !KNOWN_ARABIC_VARIANTS.has(`${surahNum}:${n}`)) {
      badArabic.push(n);
    }
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
      if (KNOWN_EMPTY_TAFSIR.has(`${taf.id}:${entry.id}`)) {
        console.log(`  · ${taf.name} kaynakta boş (bilinen eksik), atlandı`);
      } else {
        check(false, `${taf.name} dosyası`, "bulunamadı");
      }
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
 * İki kaynağın imlası farklı: quran.com Uthmani (الكتب), Açık Kuran
 * imlâî (الكتاب) yazıyor. Karşılaştırma için hareke, elif ve hemze gibi
 * imlaya göre değişen işaretleri düşürüp ünsüz iskeletini bırakıyoruz —
 * ayet kayması bu iskelette apaçık görünür.
 */
function consonantSkeleton(text) {
  return String(text ?? "")
    .replace(/[\u064b-\u0652\u0670\u0656-\u065f\u06d6-\u06ed\u0640]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u064a]/g, "")
    .replace(/[اء]/g, "");
}

function trigrams(text) {
  const out = new Set();
  for (let i = 0; i + 3 <= text.length; i++) out.add(text.slice(i, i + 3));
  if (out.size === 0 && text) out.add(text);
  return out;
}

/** 0..1 arası üçlü-harf (trigram) benzerliği. */
function similarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  let intersection = 0;
  for (const t of A) if (B.has(t)) intersection++;
  return intersection / (A.size + B.size - intersection || 1);
}

/**
 * Arapça metin quran.com'dan, meal ve okunuş Açık Kuran'dan geliyor.
 * Yukarıdaki kontroller her kaynağı kendi içinde doğruluyor; bu kontrol
 * ikisinin *aynı ayet numaralandırmasını* kullandığını doğruluyor. İki
 * kaynak bir yerde kayarsa meal sessizce yanlış ayete yapışır ve ekranda
 * gayet normal görünür.
 *
 * Eşik ölçümle belirlendi: doğru eşleşen ayetlerin en düşük benzerliği
 * 0.85, bir ayet kaydırılmış eşleşmelerin en yükseği 0.41.
 */
const SAME_VERSE_SIMILARITY = 0.6;

async function verifyAlignment(index) {
  const fullSurahs = index.entries.filter((e) => !e.range);
  console.log(`\nAyet hizası (quran.com ↔ Açık Kuran, ${fullSurahs.length} sure)`);

  let mismatches = 0;
  let compared = 0;
  for (const entry of fullSurahs) {
    const remote = (await api(`${AK_API}/surah/${entry.audio_surah}?author=11`)).data;
    const { verses } = await readJson(
      path.join(ROOT, "public", "data", `surah-${entry.id}.json`),
    );
    const byNumber = new Map(verses.map((v) => [v.verse_number, v]));

    for (const v of remote.verses) {
      const mine = byNumber.get(v.verse_number);
      const sim = similarity(
        consonantSkeleton((mine?.arabic_words ?? []).join("")),
        consonantSkeleton(v.verse),
      );
      compared++;
      if (sim < SAME_VERSE_SIMILARITY) {
        mismatches++;
        check(
          false,
          `hiza ${entry.audio_surah}:${v.verse_number}`,
          `iki kaynağın Arapça metni uyuşmuyor (benzerlik ${sim.toFixed(2)})`,
        );
      }
    }
  }
  check(mismatches === 0, `Ayet hizası (${compared} ayet)`);
  console.log(`  ${compared} ayet karşılaştırıldı, ${mismatches} sapma`);
}

async function verifyEntry(index, entry) {
  console.log(`\n${entry.name} (${entry.id})`);
  // Bölüm id'si sure numarası olmayabilir (Âmenerrasûlü gibi kısmi bölümler).
  const surahNum = entry.audio_surah;

  const { verses, ourVerse, range, first, last } =
    await loadAndCheckContinuity(entry);

  // 1b) Besmele satırı (0. ayet): Fatiha'da besmele 1. ayetin kendisi,
  // Tevbe'de hiç yok, kısmi bölümler sure ortasından başlar.
  const hasZero = verses.some((v) => v.verse_number === 0);
  const shouldHaveZero = !entry.range && surahNum !== 1 && surahNum !== 9;
  check(
    hasZero === shouldHaveZero,
    "besmele satırı",
    hasZero ? "fazladan var" : "eksik",
  );

  // 1c) Ses: Türkçe meal sesi ve sure başına tek dosya tilavet yalnızca
  // tam surelerde olur (Açık Kuran sesi sure başına tek dosya sunuyor).
  const continuousCount = Object.keys(entry.continuous_audio ?? {}).length;
  const timedReciterCount = index.reciters.length;
  if (entry.range) {
    check(!entry.audio, "kısmi bölümde meal sesi olmamalı");
    check(continuousCount === 0, "kısmi bölümde sürekli tilavet olmamalı");
  } else {
    check(Boolean(entry.audio?.url), "Türkçe meal sesi adresi");
    check(
      continuousCount === timedReciterCount,
      "sürekli tilavet adresleri",
      `${continuousCount}/${timedReciterCount} kari`,
    );
  }

  // 1d) Kelime zaman damgaları: her kari için kelime sayısının iki katı
  // (her kelimeye [başlangıç, bitiş]).
  const badTimings = [];
  for (const v of verses) {
    const wordCount = v.arabic_words?.length ?? 0;
    for (const r of index.reciters) {
      const flat = v.timings?.[r.id];
      if (!flat) continue;
      if (flat.length !== wordCount * 2) badTimings.push(`${v.verse_number}/${r.id}`);
    }
  }
  check(
    badTimings.length === 0,
    `Zaman damgası uzunlukları (${index.reciters.length} kari)`,
    badTimings.length ? `ilk sapma ayet ${badTimings[0]}` : "",
  );

  // 2) Türkçe meal: her yazarın her ayeti
  const trList = index.translations.filter((x) => x.lang === "tr");
  const trSources = await mapLimit(trList, REQUEST_CONCURRENCY, async (t) =>
    (await api(`${AK_API}/surah/${surahNum}?author=${t.source_id}`)).data,
  );
  for (const [ti, t] of trList.entries()) {
    const src = trSources[ti];
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

  // Bir bölümde kaynağa hiç erişilemezse (ağ, geçici 5xx) o girdiyi
  // "atlandı" diye işaretleyip devam ediyoruz: tek bir isteğin düşmesi
  // 117 bölümlük doğrulamayı iptal etmemeli. Atlanan varsa çıkış kodu 2.
  let skipped = 0;
  for (const entry of index.entries) {
    try {
      await verifyEntry(index, entry);
    } catch (err) {
      skipped++;
      console.error(`\n${entry.name} (${entry.id}) — ATLANDI: ${err.message}`);
    }
  }

  await verifyAlignment(index);

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
