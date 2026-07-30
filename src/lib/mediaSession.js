/**
 * Kilit ekranı / bildirim alanı kontrolleri.
 *
 * Bunu bağlamak arka planda çalmayı da güvenilir kılıyor: tarayıcı sesi
 * "kullanıcının takip ettiği bir medya" olarak tanıyınca uygulama arka plana
 * alındığında duraklatmıyor ve sistem oynat/duraklat düğmeleri çalışıyor.
 */
export function setupMediaSession({ title, artist, artwork, handlers }) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return () => {};
  }

  navigator.mediaSession.metadata = new window.MediaMetadata({
    title,
    artist,
    artwork: artwork ? [{ src: artwork, sizes: "512x512", type: "image/png" }] : [],
  });

  const bound = Object.entries(handlers).filter(([, fn]) => typeof fn === "function");
  for (const [action, fn] of bound) {
    try {
      navigator.mediaSession.setActionHandler(action, fn);
    } catch {
      // Tarayıcı bu eylemi desteklemiyorsa sessizce geç.
    }
  }

  return () => {
    for (const [action] of bound) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // yok say
      }
    }
  };
}

export function setPlaybackState(state) {
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.playbackState = state;
  }
}
