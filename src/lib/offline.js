// Sure seslerinin offline kullanım için indirilmesi.
//
// Neden elle indirme: <audio> elementi ses dosyalarını her zaman Range
// (206 Partial Content) isteğiyle çeker. Service worker bu kısmi yanıtları
// cache'lemez (cache'lese bile eksik dosya olur), yani sadece dinlemekle
// dosya offline'a alınmaz. Burada tam dosyayı tek seferde indirip
// service worker'ın okuduğu cache'e yazıyoruz; workbox tarafındaki
// rangeRequests eklentisi de bu tam yanıttan Range dilimleri servis ediyor.

const CACHE_NAME = "surah-audio";

export const cacheApiSupported =
  typeof caches !== "undefined" && typeof window !== "undefined";

export async function isAudioCached(url) {
  if (!cacheApiSupported) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url, { ignoreVary: true });
    return Boolean(hit);
  } catch {
    return false;
  }
}

/**
 * Sesi indirip cache'e yazar. onProgress(0..1) ilerleme bildirir;
 * sunucu Content-Length vermezse ilerleme null gelir.
 */
export async function downloadAudio(url, { onProgress, signal } = {}) {
  if (!cacheApiSupported) {
    throw new Error("Bu tarayıcı offline indirmeyi desteklemiyor.");
  }

  let response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    // Ses sunucusu CORS başlığı göndermiyorsa tarayıcı isteği engeller.
    // Dinlemek yine de çalışır (<audio> CORS istemez), yalnızca offline
    // indirme mümkün olmaz.
    throw new Error(
      "Ses dosyasına erişilemedi. Sunucu tarayıcıdan indirmeye izin vermiyor olabilir; dinlemek için internet gerekir.",
    );
  }

  if (!response.ok) {
    throw new Error(`İndirme başarısız (${response.status})`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();

  // Akış okunamıyorsa ilerleme gösteremeden doğrudan cache'e yaz.
  if (!reader) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response);
    onProgress?.(1);
    return;
  }

  const chunks = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(total ? received / total : null);
  }

  const body = new Blob(chunks, {
    type: response.headers.get("content-type") || "audio/mpeg",
  });

  // Range dilimleme için Content-Length ve Content-Type korunmalı.
  const cacheable = new Response(body, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": body.type,
      "Content-Length": String(body.size),
      "Accept-Ranges": "bytes",
    },
  });

  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, cacheable);
  onProgress?.(1);
}

export async function deleteAudio(url) {
  if (!cacheApiSupported) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(url, { ignoreVary: true });
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
