import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { markSurahCompleted } from "../lib/streak";
import { clearProgress, getProgress, saveProgress } from "../lib/progress";
import {
  groupByTranslation,
  rangeLabel,
  stripRangePrefix,
} from "../lib/translations";
import { setPlaybackState, setupMediaSession } from "../lib/mediaSession";
import AudioPlayer from "./AudioPlayer";
import OfflineToggle from "./OfflineToggle";

/**
 * Meal dinleme. Ses sure başına tek mp3 ve arka planda çalmaya uygun.
 *
 * Kayıt ekranda seçili mealin okunuşu değil (Açık Kuran tek bir Türkçe ses
 * sunuyor ve `author` ne olursa olsun aynı dosyayı döndürüyor), bu yüzden
 * metinde kelime ya da ayet vurgusu yapmıyoruz — yanıltıcı olurdu.
 */
export default function MealListener({ surah, verses, translationId }) {
  const groups = useMemo(
    () => groupByTranslation(verses, translationId),
    [verses, translationId],
  );

  const handleEnded = useCallback(() => {
    markSurahCompleted(surah.id);
    clearProgress(surah.id);
  }, [surah.id]);

  const player = useAudioPlayer({ onEnded: handleEnded });
  const { audioRef, isPlaying, currentTime, duration, seekBy, togglePlay } =
    player;
  const totalDuration = duration || surah.audio.duration;

  // Kilit ekranı kontrolleri + arka planda çalmaya devam
  useEffect(() => {
    return setupMediaSession({
      title: `${surah.name} — meal`,
      artist: "Günlük Kur'an",
      artwork: "/pwa-512x512.png",
      handlers: {
        play: () => audioRef.current?.play(),
        pause: () => audioRef.current?.pause(),
        seekbackward: () => seekBy(-10),
        seekforward: () => seekBy(10),
      },
    });
  }, [surah.name, audioRef, seekBy]);

  useEffect(() => {
    setPlaybackState(isPlaying ? "playing" : "paused");
  }, [isPlaying]);

  // Kaldığı yerden devam
  const restoredRef = useRef(false);
  useEffect(() => {
    restoredRef.current = false;
  }, [surah.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || restoredRef.current) return;
    const restore = () => {
      if (restoredRef.current) return;
      const saved = getProgress(surah.id);
      if (saved?.mealTime > 0 && saved.mealTime < audio.duration - 5) {
        audio.currentTime = saved.mealTime;
      }
      restoredRef.current = true;
    };
    if (audio.readyState >= 1) restore();
    else audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [surah.id, audioRef]);

  useEffect(() => {
    if (!restoredRef.current || currentTime <= 0) return;
    const id = setTimeout(
      () => saveProgress(surah.id, { mealTime: currentTime }),
      1000,
    );
    return () => clearTimeout(id);
  }, [currentTime, surah.id]);

  return (
    <>
      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalDuration}
        playbackRate={player.playbackRate}
        onTogglePlay={togglePlay}
        onSeekBy={seekBy}
        onSeekTo={player.seekTo}
        onCycleRate={player.cycleRate}
      />
      <audio ref={audioRef} src={surah.audio.url} preload="metadata" />

      <p className="px-5 pt-3 text-xs leading-relaxed text-ink-700/60 dark:text-cream-200/50">
        Bu kayıt, aşağıda okuduğunuz mealin seslendirmesi değildir — Açık Kuran
        sure başına tek bir Türkçe ses sunuyor ve o kayıt başka bir çeviriden
        okunuyor. Metin, ayarlardan seçtiğiniz meale göre gösterilir.
      </p>

      <OfflineToggle
        urls={[surah.audio.url]}
        label="Meal sesini offline'a indir"
      />

      <div className="flex-1 px-6 py-4">
        {groups.map((group) => (
          <section key={group.from} className="mb-6">
            <span className="text-xs font-medium text-teal-700/70 dark:text-gold-500/70">
              {rangeLabel(group)}
            </span>
            <p className="mt-1 font-[var(--font-reading)] text-lg leading-[1.85] text-ink-900 dark:text-cream-100">
              {stripRangePrefix(group.text)}
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
