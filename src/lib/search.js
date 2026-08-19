/**
 * Sure listesi araması. 114 sure + kısmi bölümlerde listeyi kaydırarak
 * aramak zor; kutu hem isim hem sure numarası hem de Türkçe anlamla
 * eşleşiyor.
 */

/**
 * Aramayı aksan ve Türkçe harf farklarına duyarsız hale getirir:
 * "İhlas" ile "ihlâs", "Kehf" ile "kehf" aynı sonucu verir.
 *
 * Sıra önemli: önce Türkçe küçük harfe çeviriyoruz (I -> ı), sonra
 * birleşik karakterleri ayırıp aksanları atıyoruz (â -> a, ş -> s),
 * en son ayrışmayan ı'yı i'ye indiriyoruz.
 */
export function normalizeSearch(text) {
  return String(text ?? "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/['’`]/g, "")
    .trim();
}

/**
 * Bölüm arama sorgusuyla eşleşiyor mu: adı, Türkçe anlamı ya da sure
 * numarası. Boş sorguda her şey eşleşir.
 */
export function entryMatches(entry, query) {
  const q = normalizeSearch(query);
  if (!q) return true;

  const surahNumber = String(entry.audio_surah ?? entry.id);
  if (surahNumber === q) return true;

  return (
    normalizeSearch(entry.name).includes(q) ||
    normalizeSearch(entry.subtitle).includes(q)
  );
}
