import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeContinuous } from "../lib/recitation";

const RATES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Sure başına tek dosya tilavet.
 *
 * Ayet ayet moddan farkı: ses kesintisiz akar, aktif ayet ve kelime
 * dosyadaki mutlak zaman damgalarından bulunur. Ayet geçişlerinde hiç
 * boşluk olmaz çünkü yeni dosya yüklenmiyor.
 */
export function useContinuousPlayer({ url, verses, reciterId, onFinished }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(1);

  const rate = RATES[rateIndex];

  // Ayet sınırları (ms) — arama için bir kez çözülür.
  const spans = useMemo(
    () =>
      verses.map((v) => {
        const d = decodeContinuous(v.ctimings?.[reciterId]);
        return d ? [d[0], d[1]] : null;
      }),
    [verses, reciterId],
  );

  const timeMs = currentTime * 1000;

  // Aktif ayet: zamanı kapsayan son ayet. Ayetler arası sessizlikte
  // önceki ayet aktif kalır, böylece vurgu titremez.
  const activeIndex = useMemo(() => {
    let active = 0;
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (s && s[0] <= timeMs) active = i;
      else if (s && s[0] > timeMs) break;
    }
    return active;
  }, [spans, timeMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      onFinished?.();
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
  }, [onFinished]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, []);

  const seekTo = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const seekBy = useCallback((delta) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + delta, 0),
      audio.duration || Infinity,
    );
  }, []);

  /** Bir ayetin başına dön; istenirse oradan çalmaya başla. */
  const goTo = useCallback(
    (index, { autoplay } = {}) => {
      const span = spans[index];
      const audio = audioRef.current;
      if (!span || !audio) return;
      audio.currentTime = span[0] / 1000;
      setCurrentTime(span[0] / 1000);
      if (autoplay && audio.paused) audio.play().catch(() => {});
    },
    [spans],
  );

  const cycleRate = useCallback(() => {
    setRateIndex((prev) => (prev + 1) % RATES.length);
  }, []);

  return {
    audioRef,
    url,
    index: activeIndex,
    isPlaying,
    currentTime,
    duration,
    timeMs,
    playbackRate: rate,
    togglePlay,
    goTo,
    seekTo,
    seekBy,
    cycleRate,
  };
}
