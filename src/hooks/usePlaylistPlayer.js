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
 * Geçişlerin akıcı olması için iki ses elementi dönüşümlü kullanılıyor:
 * biri çalarken diğeri sıradaki ayeti tamamen yüklüyor, ayet bitince
 * yükleme beklemeden ikinciye geçiliyor. Tek elementte src değiştirmek
 * her ayet arasında duyulur bir boşluk bırakıyordu.
 */
export function usePlaylistPlayer({ items, onFinished }) {
  const slotsRef = useRef(null);
  const activeSlotRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const indexRef = useRef(0);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(1);

  const rate = RATES[rateIndex];

  if (slotsRef.current === null && typeof Audio !== "undefined") {
    slotsRef.current = [new Audio(), new Audio()];
    for (const a of slotsRef.current) a.preload = "auto";
  }

  const activeAudio = useCallback(() => {
    return slotsRef.current?.[activeSlotRef.current] ?? null;
  }, []);

  const idleAudio = useCallback(() => {
    return slotsRef.current?.[1 - activeSlotRef.current] ?? null;
  }, []);

  /** Sıradaki ayeti boştaki elemana yükle. */
  const preloadNext = useCallback(
    (nextIndex) => {
      const next = items[nextIndex];
      const idle = idleAudio();
      if (!next || !idle) return;
      if (idle.src !== next.url) {
        idle.src = next.url;
        idle.load();
      }
    },
    [items, idleAudio],
  );

  // Olayları iki elemana da bağlıyoruz; yalnızca aktif olanınkini dikkate
  // alıyoruz, böylece geçişte listener taşımaya gerek kalmıyor.
  useEffect(() => {
    const slots = slotsRef.current;
    if (!slots) return;

    const isActive = (el) => el === slots[activeSlotRef.current];

    const onTimeUpdate = (e) => {
      if (isActive(e.target)) setCurrentTime(e.target.currentTime);
    };
    const onLoadedMetadata = (e) => {
      if (isActive(e.target)) setDuration(e.target.duration || 0);
    };
    const onPlay = (e) => {
      if (isActive(e.target)) setIsPlaying(true);
    };
    const onPause = (e) => {
      if (isActive(e.target)) setIsPlaying(false);
    };
    const onEnded = (e) => {
      if (!isActive(e.target)) return;
      const nextIndex = indexRef.current + 1;
      if (nextIndex >= items.length) {
        shouldPlayRef.current = false;
        setIsPlaying(false);
        onFinished?.();
        return;
      }
      // Sıradaki ayet boştaki elemanda hazır: yüklemeyi beklemeden geç.
      activeSlotRef.current = 1 - activeSlotRef.current;
      indexRef.current = nextIndex;
      setIndex(nextIndex);
      const audio = slots[activeSlotRef.current];
      audio.currentTime = 0;
      audio.playbackRate = RATES[rateIndex];
      if (shouldPlayRef.current) audio.play().catch(() => {});
      preloadNext(nextIndex + 1);
    };

    for (const a of slots) {
      a.addEventListener("timeupdate", onTimeUpdate);
      a.addEventListener("loadedmetadata", onLoadedMetadata);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("ended", onEnded);
    }
    return () => {
      for (const a of slots) {
        a.removeEventListener("timeupdate", onTimeUpdate);
        a.removeEventListener("loadedmetadata", onLoadedMetadata);
        a.removeEventListener("play", onPlay);
        a.removeEventListener("pause", onPause);
        a.removeEventListener("ended", onEnded);
      }
    };
  }, [items.length, onFinished, preloadNext, rateIndex]);

  // Liste değiştiğinde (sure/kari) baştan kur.
  useEffect(() => {
    const slots = slotsRef.current;
    if (!slots || items.length === 0) return;

    activeSlotRef.current = 0;
    indexRef.current = 0;
    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    slots[0].src = items[0].url;
    slots[0].load();
    if (items[1]) {
      slots[1].src = items[1].url;
      slots[1].load();
    }

    return () => {
      for (const a of slots) {
        a.pause();
        a.removeAttribute("src");
      }
    };
  }, [items]);

  useEffect(() => {
    for (const a of slotsRef.current ?? []) a.playbackRate = rate;
  }, [rate]);

  const togglePlay = useCallback(() => {
    const audio = activeAudio();
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
  }, [activeAudio]);

  /** Bir ayete atla; her zaman o ayetin başından başlar. */
  const goTo = useCallback(
    (nextIndex, { autoplay } = {}) => {
      const slots = slotsRef.current;
      if (!slots) return;
      const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
      const target = items[clamped];
      if (!target) return;

      if (autoplay) shouldPlayRef.current = true;

      const active = slots[activeSlotRef.current];
      const idle = slots[1 - activeSlotRef.current];

      // İstenen ayet zaten boştaki elemanda yüklüyse ona geç; değilse
      // aktif elemana yükle.
      if (idle.src === target.url) {
        active.pause();
        activeSlotRef.current = 1 - activeSlotRef.current;
      } else if (active.src !== target.url) {
        active.src = target.url;
        active.load();
      }

      const audio = slots[activeSlotRef.current];
      audio.currentTime = 0;
      audio.playbackRate = rate;
      setCurrentTime(0);
      indexRef.current = clamped;
      setIndex(clamped);
      if (shouldPlayRef.current) audio.play().catch(() => {});
      preloadNext(clamped + 1);
    },
    [items, rate, preloadNext],
  );

  const seekBy = useCallback(
    (delta) => {
      const audio = activeAudio();
      if (!audio) return;
      audio.currentTime = Math.min(
        Math.max(audio.currentTime + delta, 0),
        audio.duration || Infinity,
      );
    },
    [activeAudio],
  );

  const seekTo = useCallback(
    (seconds) => {
      const audio = activeAudio();
      if (audio) audio.currentTime = seconds;
    },
    [activeAudio],
  );

  const cycleRate = useCallback(() => {
    setRateIndex((prev) => (prev + 1) % RATES.length);
  }, []);

  return {
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
