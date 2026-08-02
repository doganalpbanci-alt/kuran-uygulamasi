import index from "../data/index.json";

/**
 * Ayet ve tefsir verisi uygulamayla paketlenmiyor: her bölüm ilk açıldığında
 * indiriliyor ve service worker tarafından kalıcı olarak cache'leniyor.
 *
 * Sebep boyut: 6 bölüm tek pakette 602 KB gzip tutuyordu; nüzûl sırasıyla
 * okumak için gereken sure sayısında bu birkaç MB'a çıkardı. Artık uygulama
 * küçük kalıyor, indirilen bölüm ise kalıcı olarak offline çalışıyor.
 */

export const INDEX = index;
export const ENTRIES = index.entries;
export const TAFSIRS = index.tafsirs ?? [];

const BASE = `${import.meta.env.BASE_URL}data/`;
const VERSION = index.data_version;

// Aynı bölüm tekrar açıldığında ağa da cache'e de gitmemek için.
const memory = new Map();

async function loadJson(file) {
  if (memory.has(file)) return memory.get(file);

  const promise = fetch(`${BASE}${file}?v=${VERSION}`).then((res) => {
    if (!res.ok) throw new Error(`Veri yüklenemedi: ${file} (${res.status})`);
    return res.json();
  });

  // Promise'i saklıyoruz ki aynı anda iki istek gitmesin; hata olursa
  // bir dahaki denemede yeniden istensin diye siliyoruz.
  memory.set(file, promise);
  promise.catch(() => memory.delete(file));
  return promise;
}

export function getEntry(id) {
  return ENTRIES.find((e) => String(e.id) === String(id)) ?? null;
}

/** Bölümün ayetleri. */
export async function loadVerses(entryId) {
  const { verses } = await loadJson(`surah-${entryId}.json`);
  return verses;
}

/** Bölümün seçili tefsirdeki blokları; yoksa boş dizi. */
export async function loadTafsir(tafsirId, entryId) {
  try {
    const { blocks } = await loadJson(`tafsir-${tafsirId}-${entryId}.json`);
    return blocks;
  } catch {
    return [];
  }
}

/** Bu bölümün verisi daha önce indirilmiş mi (cache'te var mı). */
export async function isEntryCached(entryId) {
  if (typeof caches === "undefined") return false;
  try {
    const hit = await caches.match(`${BASE}surah-${entryId}.json?v=${VERSION}`, {
      ignoreVary: true,
    });
    return Boolean(hit);
  } catch {
    return false;
  }
}
