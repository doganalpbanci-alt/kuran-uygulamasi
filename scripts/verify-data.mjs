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
const TAFSIR_SOURCE_ID = 169; // Ibn Kathir (Abridged)

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

async function verifyEntry(index, entry) {
  console.log(`\n${entry.name} (${entry.id})`);
  // Bölüm id'si sure numarası olmayabilir (Âmenerrasûlü gibi kısmi bölümler).
  const surahNum = entry.audio_surah;

  const { verses } = await readJson(
    path.join(ROOT, "public", "data", `surah-${entry.id}.json`),
  );
  const numbered = verses.filter((v) => v.verse_number > 0);

  // 1) Ayet sayısı ve numaraların sürekliliği
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

  const ourVerse = (n) => numbered.find((v) => v.verse_number === n);
  const range = [];
  for (let n = first; n <= last; n++) range.push(n);

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

  // 4) Arapça: kelimelerin birleşimi ayetin kendi metnine eşit mi
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
    // Boşluk karşılaştırmadan çıktığı için kelime bölünmesi ayrıca denetleniyor.
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

  // 5) Tefsir: blokları kaynaktan bağımsızca kurup birebir karşılaştır
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
    // Tam surelerde kaynak satır sayısı bölümün ayet sayısına eşit olmalı;
    // kısmi bölümlerde (Âmenerrasûlü) yalnızca aralığı kapsaması yeter.
    check(
      entry.range ? src.rowCount >= last : src.rowCount === entry.verse_count,
      `${taf.name} kaynak ayet sayısı`,
      `${src.rowCount} / beklenen ${entry.range ? `>= ${last}` : entry.verse_count}`,
    );

    // Kısmi bölümde yalnızca kesişen bloklar bekleniyor.
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

    // Etiketlenen aralıklar bölümün tamamını boşluksuz kapsamalı: bir
    // ayetin tefsirine hiç ulaşılamaması sessiz bir eksiklik olurdu.
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

  console.log(`  ${checks - failures}/${checks} kontrol geçti`);
}

async function main() {
  const index = await readJson(path.join(ROOT, "src", "data", "index.json"));

  for (const entry of index.entries) {
    await verifyEntry(index, entry);
  }

  console.log(
    `\n${failures === 0 ? "TÜM KONTROLLER GEÇTİ" : `${failures} KONTROL BAŞARISIZ`} (${checks} kontrol)`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
