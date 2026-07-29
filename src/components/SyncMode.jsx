import { useMemo, useState } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { getVersesWithOverrides } from "../lib/verses";
import {
  clearOverridesForSurah,
  downloadOverridesFile,
  setVerseStartTime,
} from "../lib/sync";
import AudioPlayer from "./AudioPlayer";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SyncMode({ surah, onBack }) {
  const [verses, setVerses] = useState(() => getVersesWithOverrides(surah));
  const [pointer, setPointer] = useState(0);

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
  } = useAudioPlayer();

  const refreshVerses = () => setVerses(getVersesWithOverrides(surah));

  const markCurrentVerse = () => {
    const verse = verses[pointer];
    if (!verse) return;
    setVerseStartTime(surah.id, verse.verse_number, currentTime);
    refreshVerses();
    setPointer((p) => Math.min(p + 1, verses.length - 1));
  };

  const handleReset = () => {
    if (!confirm(`${surah.name} için tüm zaman damgaları silinsin mi?`)) return;
    clearOverridesForSurah(surah.id);
    refreshVerses();
    setPointer(0);
  };

  const syncedCount = useMemo(
    () => verses.filter((v) => typeof v.start_time === "number").length,
    [verses],
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Geri
        </button>
        <h1 className="text-base font-semibold text-ink-900 dark:text-cream-100">
          Senkron Modu — {surah.name}
        </h1>
        <span className="w-10" />
      </div>

      <p className="px-5 pt-2 text-xs text-ink-700/60 dark:text-cream-200/60">
        Sesi dinlerken bir ayete geldiğinde "Bu ayet burada başlıyor" tuşuna
        bas. {syncedCount}/{verses.length} ayet işaretlendi.
      </p>

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

      <div className="px-5 py-4">
        <button
          type="button"
          onClick={markCurrentVerse}
          className="w-full rounded-xl bg-teal-600 py-4 text-base font-medium text-cream-50 shadow-sm"
        >
          ● Bu ayet burada başlıyor (ayet {verses[pointer]?.verse_number})
        </button>

        <div className="mt-4 flex gap-2 text-xs">
          <button
            type="button"
            onClick={downloadOverridesFile}
            className="rounded-full border border-teal-600/30 px-3 py-1.5 text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
          >
            Dışa aktar (JSON)
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-red-500/30 px-3 py-1.5 text-red-600 dark:text-red-400"
          >
            Bu sureyi sıfırla
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-5 pb-6">
        {verses.map((verse, i) => (
          <button
            type="button"
            key={verse.verse_number}
            onClick={() => setPointer(i)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
              i === pointer
                ? "bg-gold-500/20 ring-1 ring-gold-500/50"
                : "hover:bg-teal-600/5"
            }`}
          >
            <span className="truncate text-ink-900 dark:text-cream-100">
              {verse.verse_number}. {verse.transcription}
            </span>
            <span className="ml-2 shrink-0 text-xs text-ink-700/60 dark:text-cream-200/60">
              {typeof verse.start_time === "number"
                ? formatTime(verse.start_time)
                : "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
