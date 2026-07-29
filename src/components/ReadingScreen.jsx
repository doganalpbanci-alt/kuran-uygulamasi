import { useEffect, useMemo, useRef } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import {
  computeEffectiveStartTimes,
  findActiveVerseIndex,
  getVersesWithOverrides,
} from "../lib/verses";
import { markSurahCompleted } from "../lib/streak";
import AudioPlayer from "./AudioPlayer";

export default function ReadingScreen({ surah, onBack, onOpenSync }) {
  const verses = useMemo(() => getVersesWithOverrides(surah), [surah]);
  const verseRefs = useRef([]);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    seekBy,
    seekTo,
    cycleRate,
  } = useAudioPlayer({
    onEnded: () => markSurahCompleted(surah.id),
  });

  const effectiveStartTimes = useMemo(
    () => computeEffectiveStartTimes(verses, duration || surah.audio.duration),
    [verses, duration, surah.audio.duration],
  );

  const activeIndex = findActiveVerseIndex(effectiveStartTimes, currentTime);

  useEffect(() => {
    const el = verseRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  const handleMarkAsRead = () => {
    markSurahCompleted(surah.id);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Sureler
        </button>
        <h1 className="text-base font-semibold text-ink-900 dark:text-cream-100">
          {surah.name}
        </h1>
        <button
          type="button"
          onClick={onOpenSync}
          aria-label="Senkron modu"
          className="text-sm text-ink-700/50 dark:text-cream-200/50"
        >
          ⚙
        </button>
      </div>

      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration || surah.audio.duration}
        playbackRate={playbackRate}
        onTogglePlay={togglePlay}
        onSeekBy={seekBy}
        onSeekTo={seekTo}
        onCycleRate={cycleRate}
      />
      <audio ref={audioRef} src={surah.audio.url} preload="metadata" />

      <div className="flex-1 space-y-6 px-5 py-6">
        {verses.map((verse, i) => (
          <div
            key={verse.verse_number}
            ref={(el) => (verseRefs.current[i] = el)}
            className={`rounded-xl px-3 py-3 transition-colors ${
              i === activeIndex
                ? "bg-gold-500/15 ring-1 ring-gold-500/40"
                : ""
            }`}
          >
            <p className="flex items-start gap-2 font-[var(--font-reading)] text-xl leading-relaxed text-ink-900 dark:text-cream-100">
              <span className="mt-1 shrink-0 text-xs font-medium text-teal-700/70 dark:text-gold-500/70">
                {verse.verse_number}
              </span>
              {verse.transcription}
            </p>
            <p className="mt-1.5 pl-6 text-sm leading-relaxed text-ink-700/70 dark:text-cream-200/60">
              {verse.translation}
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={handleMarkAsRead}
          className="mx-auto block rounded-full border border-teal-600/30 px-5 py-2 text-sm text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          ✓ Okudum olarak işaretle
        </button>
      </div>
    </div>
  );
}
