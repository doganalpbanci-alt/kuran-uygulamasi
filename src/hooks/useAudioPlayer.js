import { useCallback, useEffect, useRef, useState } from "react";

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function useAudioPlayer({ onEnded } = {}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(1); // 1x varsayılan

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, []);

  const seekBy = useCallback((deltaSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + deltaSeconds, 0),
      audio.duration || Infinity,
    );
  }, []);

  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
  }, []);

  const cycleRate = useCallback(() => {
    setRateIndex((prev) => {
      const next = (prev + 1) % RATES.length;
      if (audioRef.current) audioRef.current.playbackRate = RATES[next];
      return next;
    });
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate: RATES[rateIndex],
    togglePlay,
    seekBy,
    seekTo,
    cycleRate,
  };
}
