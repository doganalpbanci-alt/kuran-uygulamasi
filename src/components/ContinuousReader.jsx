import { useCallback, useEffect, useRef } from "react";
import { useContinuousPlayer } from "../hooks/useContinuousPlayer";
import { markSurahCompleted } from "../lib/streak";
import { clearProgress, getProgress, saveProgress } from "../lib/progress";
import { getTimedWords, reciterLabel, reciterSync } from "../lib/recitation";
import { getPrefs } from "../lib/prefs";
import AudioPlayer from "./AudioPlayer";
import VerseList from "./VerseList";
import OfflineToggle from "./OfflineToggle";

/**
 * Sure başına tek dosya tilavet: ses baştan sona kesintisiz akar, aktif
 * ayet ve kelime dosyadaki mutlak zaman damgalarından bulunur.
 */
export default function ContinuousReader({
  surah,
  verses,
  reciter,
  url,
  layout,
  translationId,
}) {
  const verseRefs = useRef([]);
  // Kelime imleci yalnızca kelime zaman damgası olan karilerde.
  const wordCursor = getPrefs().wordCursor && reciterSync(reciter) === "word";

  const handleFinished = useCallback(() => {
    markSurahCompleted(surah.id);
    clearProgress(surah.id);
  }, [surah.id]);

  const player = useContinuousPlayer({
    url,
    verses,
    reciterId: reciter.id,
    onFinished: handleFinished,
  });
  const { audioRef, index, isPlaying, currentTime, timeMs } = player;

  const arabicWordsFor = useCallback(
    (verse) => getTimedWords(verse, reciter.id, { continuous: true }),
    [reciter.id],
  );

  // Kaldığı yerden devam
  const restoredRef = useRef(false);
  useEffect(() => {
    restoredRef.current = false;
  }, [surah.id, reciter.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || restoredRef.current) return;
    const restore = () => {
      if (restoredRef.current) return;
      const saved = getProgress(surah.id);
      if (saved?.contTime > 0 && saved.contTime < audio.duration - 5) {
        audio.currentTime = saved.contTime;
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
      () => saveProgress(surah.id, { contTime: currentTime }),
      1000,
    );
    return () => clearTimeout(id);
  }, [currentTime, surah.id]);

  useEffect(() => {
    if (!isPlaying) return;
    verseRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [index, isPlaying]);

  return (
    <>
      <audio ref={audioRef} src={url} preload="metadata" />

      <OfflineToggle
        urls={[url]}
        label={`Tilaveti offline'a indir (${reciterLabel(reciter)})`}
      />

      <VerseList
        verses={verses}
        layout={layout}
        translationId={translationId}
        activeIndex={index}
        arabicWordsFor={arabicWordsFor}
        arabicTimeMs={wordCursor ? timeMs : null}
        isPlaying={isPlaying}
        onSelectVerse={(i) => player.goTo(i, { autoplay: true })}
        verseRefs={verseRefs}
      />

      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={player.duration}
        playbackRate={player.playbackRate}
        onTogglePlay={player.togglePlay}
        onSeekBy={player.seekBy}
        onSeekTo={player.seekTo}
        onCycleRate={player.cycleRate}
      />
    </>
  );
}
