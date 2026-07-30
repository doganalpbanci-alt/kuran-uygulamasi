import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import {
  computeEffectiveStartTimes,
  findActiveVerseIndex,
} from "../lib/verses";
import { markSurahCompleted } from "../lib/streak";
import { clearProgress, getProgress, saveProgress } from "../lib/progress";
import { AUTHOR_NAME } from "../lib/recitation";
import AudioPlayer from "./AudioPlayer";
import VerseList from "./VerseList";
import OfflineToggle from "./OfflineToggle";

/** Türkçe meal sesi: sure başına tek mp3, ayet senkronu start_time'lardan. */
export default function MealReader({ surah, verses }) {
  const verseRefs = useRef([]);

  const handleEnded = useCallback(() => {
    markSurahCompleted(surah.id);
    clearProgress(surah.id);
  }, [surah.id]);

  const player = useAudioPlayer({ onEnded: handleEnded });
  const { audioRef, isPlaying, currentTime, duration, seekTo } = player;

  const totalDuration = duration || surah.audio.duration;

  const effectiveStartTimes = useMemo(
    () => computeEffectiveStartTimes(verses, totalDuration),
    [verses, totalDuration],
  );

  const activeIndex = findActiveVerseIndex(effectiveStartTimes, currentTime);

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
      if (saved?.time > 0 && saved.time < audio.duration - 5) {
        audio.currentTime = saved.time;
      }
      restoredRef.current = true;
    };

    if (audio.readyState >= 1) restore();
    else audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [surah.id, audioRef]);

  useEffect(() => {
    if (!restoredRef.current || currentTime <= 0) return;
    saveProgress(surah.id, {
      time: currentTime,
      verseNumber: verses[activeIndex]?.verse_number ?? 0,
    });
    // Kayıt aktif ayet değiştiğinde yapılır, saniyede birkaç kez değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, surah.id, verses]);

  useEffect(() => {
    if (!isPlaying) return;
    verseRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex, isPlaying]);

  return (
    <>
      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalDuration}
        playbackRate={player.playbackRate}
        onTogglePlay={player.togglePlay}
        onSeekBy={player.seekBy}
        onSeekTo={seekTo}
        onCycleRate={player.cycleRate}
      />
      <audio ref={audioRef} src={surah.audio.url} preload="metadata" />

      <p className="px-5 pt-3 text-xs leading-relaxed text-ink-700/60 dark:text-cream-200/50">
        Bu ses, ekranda yazan {AUTHOR_NAME} mealinin okunuşu değildir — Açık
        Kuran tek bir Türkçe kayıt sunuyor ve o kayıt başka bir çeviriden
        okunuyor. Kelimeler birebir tutmaz; vurgulanan ayet de sesin sure
        içindeki konumundan tahmin edilir.
      </p>

      <OfflineToggle urls={[surah.audio.url]} label="Meal sesini offline'a indir" />

      <VerseList
        verses={verses}
        activeIndex={activeIndex}
        showArabic={false}
        arabicWordsFor={() => []}
        arabicTimeMs={null}
        transcriptionProgress={0}
        // Ses başka bir çeviriyi okuduğu için kelime imleci anlamsız:
        // ekrandaki okunuş metniyle sesin kelimeleri hiç örtüşmüyor.
        wordCursorEnabled={false}
        isPlaying={isPlaying}
        // MP3 çerçeve yuvarlaması bir önceki ayete düşürmesin diye küçük pay.
        onSelectVerse={(i) => seekTo(effectiveStartTimes[i] + 0.25)}
        verseRefs={verseRefs}
      />
    </>
  );
}
