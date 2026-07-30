import data from "../data/surahs.json";

export const TRANSLATIONS = data.translations;
export const DEFAULT_TRANSLATION_ID = data.default_translation_id;

export function getTranslation(id) {
  return (
    TRANSLATIONS.find((t) => t.id === id) ??
    TRANSLATIONS.find((t) => t.id === DEFAULT_TRANSLATION_ID) ??
    TRANSLATIONS[0]
  );
}

export function translationText(verse, translationId) {
  return verse.translations?.[translationId] ?? "";
}

/**
 * Bazı mealler metnin başına kapsadığı aralığı yazıyor: "(3-7) Ey ...".
 * Aralığı ayrıca etiket olarak gösterdiğimiz için bu öneki ayıklıyoruz.
 */
export function stripRangePrefix(text) {
  return text.replace(/^\(\d+(?:\s*-\s*\d+)?\)\s*/, "");
}

/**
 * Ardışık ayetleri, meal metni aynıysa tek bloğa toplar.
 *
 * Bazı mealler birden çok ayeti tek cümlede çevirip aynı metni o aralıktaki
 * her ayete tekrar yazıyor (örn. Diyanet'te "(3-7) ..."). Ayet ayet
 * gösterilince aynı paragraf art arda tekrar ediyor ve okuma akışı bozuluyor.
 * Gruplama meale bağlı: Diyanet'te 31 grup varken Ali Bulaç'ta hiç yok, bu
 * yüzden derleme anında değil, seçili meale göre burada hesaplanıyor.
 *
 * Dönen her öğe: { verses: [...], from, to, text }
 */
export function groupByTranslation(verses, translationId) {
  const groups = [];
  let i = 0;

  while (i < verses.length) {
    const text = translationText(verses[i], translationId);
    let j = i;
    // Besmele (0) kendi başına dursun, sonraki ayetle birleşmesin.
    if (verses[i].verse_number !== 0) {
      while (
        j + 1 < verses.length &&
        verses[j + 1].verse_number !== 0 &&
        translationText(verses[j + 1], translationId) === text &&
        text !== ""
      ) {
        j++;
      }
    }

    groups.push({
      verses: verses.slice(i, j + 1),
      from: verses[i].verse_number,
      to: verses[j].verse_number,
      text,
    });
    i = j + 1;
  }

  return groups;
}

/** "3" veya "3-7" biçiminde aralık etiketi. */
export function rangeLabel(group) {
  return group.from === group.to ? String(group.from) : `${group.from}-${group.to}`;
}
