import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import {
  computeEffectiveStartTimes,
  findActiveVerseIndex,
  getVersesWithOverrides,
} from "../lib/verses";
import { markSurahCompleted } from "../lib/streak";
import { clearProgress, getProgress, saveProgress } from "../lib/progress";
import AudioPlayer from "./AudioPlayer";
import OfflineToggle from "./OfflineToggle";

export default function ReadingScreen({ surah, onBack, onOpenSync }) {
  const verses = useMemo(() => getVersesWithOverrides(surah), [surah]);
  const verseRefs = useRef([]);

  const handleEnded = useCallback(() => {
    markSurahCompleted(surah.id);
    // Sure bitti; bir dahaki açılışta baştan başlasın.
    clearProgress(surah.id);
  }, [surah.id]);

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
  } = useAudioPlayer({ onEnded: handleEnded });

  const effectiveStartTimes = useMemo(
    () => computeEffectiveStartTimes(verses, duration || surah.audio.duration),
    [verses, duration, surah.audio.duration],
  );

  const activeIndex = findActiveVerseIndex(effectiveStartTimes, currentTime);

  // Kaldığı yerden devam: metadata yüklenince kayıtlı konuma atla.
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
      // Sonuna çok yakınsa baştan başlamak daha mantıklı.
      if (saved?.time > 0 && saved.time < audio.duration - 5) {
        audio.currentTime = saved.time;
      }
      restoredRef.current = true;
    };

    if (audio.readyState >= 1) restore();
    else audio.addEventListener("loadedmetadata", restore, { once: true });

    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [surah.id, audioRef]);

  // İlerlemeyi kaydet (her timeupdate'te değil, ayet değiştikçe).
  useEffect(() => {
    if (!restoredRef.current || currentTime <= 0) return;
    saveProgress(surah.id, {
      time: currentTime,
      verseNumber: verses[activeIndex]?.verse_number ?? 0,
    });
    // currentTime kasıtlı olarak bağımlılık dışı: kayıt aktif ayet
    // değiştiğinde yapılır, saniyede birkaç kez değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, surah.id, verses]);

  // Otomatik scroll yalnızca ses çalarken; duraklatılmışken kullanıcı
  // serbestçe okuyup gezinebilsin.
  useEffect(() => {
    if (!isPlaying) return;
    const el = verseRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex, isPlaying]);

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

      <OfflineToggle url={surah.audio.url} />

      <div className="flex-1 space-y-6 px-5 py-6">
        {verses.map((verse, i) => (
          <div
            key={verse.verse_number}
            ref={(el) => {
              verseRefs.current[i] = el;
            }}
            className={`rounded-xl px-3 py-3 transition-colors ${
              i === activeIndex
                ? "bg-gold-500/15 ring-1 ring-gold-500/40"
                : ""
            }`}
          >
            <p className="flex items-start gap-2 font-[var(--font-reading)] text-xl leading-relaxed text-ink-900 dark:text-cream-100">
              <button
                type="button"
                // MP3 çerçeve sınırına yuvarlama seek'i birkaç ms geriye
                // düşürebiliyor; bu da bir önceki ayeti aktif gösteriyordu.
                // Küçük bir pay ile ayetin içine indiğimizden emin oluyoruz.
                onClick={() => seekTo(effectiveStartTimes[i] + 0.25)}
                aria-label={`${verse.verse_number}. ayetten oynat`}
                className="mt-1 shrink-0 rounded px-1 text-xs font-medium text-teal-700/70 hover:bg-teal-600/10 dark:text-gold-500/70"
              >
                {verse.verse_number}
              </button>
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
