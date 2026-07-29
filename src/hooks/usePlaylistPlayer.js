import { useCallback, useEffect, useRef, useState } from "react";

const RATES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Arapça tilavet için ayet ayet oynatıcı.
 *
 * Tilavet, sure başına tek dosya değil ayet başına ayrı mp3 olarak geliyor.
 * Bunun avantajı, aktif ayetin tahmin edilmesi gerekmemesi: çalan dosya
 * zaten o ayet. Kelime zaman damgaları da bu dosyaya göreli olduğundan
 * imleç birebir doğru çalışıyor.
 *
 * Ayet bittiğinde sıradakine geçilir; geçişin takılmaması için bir sonraki
 * ayetin dosyası önceden indirilir.
 */
export function usePlaylistPlayer({ items, onFinished }) {
  const audioRef = useRef(null);
  const preloadRef = useRef(null);
  const shouldPlayRef = useRef(false);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(1);

  const rate = RATES[rateIndex];
  const current = items[index] ?? null;

  // Kaynak değiştiğinde: yükle, gerekiyorsa çal, sonrakini ön belleğe al.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    audio.src = current.url;
    audio.playbackRate = rate;
    setCurrentTime(0);
    setDuration(0);

    if (shouldPlayRef.current) {
      audio.play().catch(() => {
        // Otomatik oynatma engellendiyse duraklatılmış kabul et.
        shouldPlayRef.current = false;
        setIsPlaying(false);
      });
    }

    const next = items[index + 1];
    if (next) {
      if (!preloadRef.current) preloadRef.current = new Audio();
      preloadRef.current.preload = "auto";
      preloadRef.current.src = next.url;
    }
    // rate kasıtlı olarak bağımlılık dışı: hız değişimi ayrı efektte
    // uygulanıyor, burada olsa her hız değişiminde kaynak yeniden yüklenirdi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, items]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIndex((prev) => {
        if (prev + 1 < items.length) return prev + 1;
        shouldPlayRef.current = false;
        setIsPlaying(false);
        onFinished?.();
        return prev;
      });
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [items.length, onFinished]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      shouldPlayRef.current = true;
      audio.play().catch(() => {
        shouldPlayRef.current = false;
        setIsPlaying(false);
      });
    } else {
      shouldPlayRef.current = false;
      audio.pause();
    }
  }, []);

  const goTo = useCallback(
    (nextIndex, { autoplay } = {}) => {
      const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
      if (autoplay) shouldPlayRef.current = true;
      setIndex((prev) => {
        // Aynı ayete basıldıysa baştan başlat.
        if (prev === clamped && audioRef.current) audioRef.current.currentTime = 0;
        return clamped;
      });
    },
    [items.length],
  );

  const seekBy = useCallback((delta) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + delta, 0),
      audio.duration || Infinity,
    );
  }, []);

  const seekTo = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const cycleRate = useCallback(() => {
    setRateIndex((prev) => (prev + 1) % RATES.length);
  }, []);

  return {
    audioRef,
    index,
    isPlaying,
    currentTime,
    duration,
    playbackRate: rate,
    togglePlay,
    goTo,
    seekBy,
    seekTo,
    cycleRate,
  };
}
