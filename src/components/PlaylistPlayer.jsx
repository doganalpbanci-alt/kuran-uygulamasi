function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Tilavet oynatıcısı. Ses ayet ayet olduğu için ilerleme çubuğu sure
 * geneli değil, çalan ayet içindir; ileri/geri de saniye değil ayet atlar.
 */
export default function PlaylistPlayer({
  index,
  total,
  verseNumber,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  togglePlay,
  goTo,
  seekTo,
  cycleRate,
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    // Alta sabit: başparmakla durdurup okumaya devam etmek için.
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-teal-700/10 bg-cream-50/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-cream-200/10 dark:bg-[#14211c]/95">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step="any"
        value={currentTime}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="Ayet içinde konum"
        className="h-1 w-full cursor-pointer accent-teal-600"
        style={{
          background: `linear-gradient(to right, var(--color-teal-600) ${progress}%, var(--color-cream-200) ${progress}%)`,
        }}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-ink-700/70 dark:text-cream-200/70">
        <span>{formatTime(currentTime)}</span>
        <span>
          Ayet {verseNumber} · {index + 1}/{total}
        </span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1, { autoplay: isPlaying })}
          disabled={index === 0}
          aria-label="Önceki ayet"
          className="rounded-full p-2 text-ink-900 hover:bg-teal-600/10 disabled:opacity-30 dark:text-cream-100"
        >
          ⏮
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Duraklat" : "Oynat"}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-xl text-cream-50 shadow-sm"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button
          type="button"
          onClick={() => goTo(index + 1, { autoplay: isPlaying })}
          disabled={index >= total - 1}
          aria-label="Sonraki ayet"
          className="rounded-full p-2 text-ink-900 hover:bg-teal-600/10 disabled:opacity-30 dark:text-cream-100"
        >
          ⏭
        </button>

        <button
          type="button"
          onClick={cycleRate}
          aria-label="Oynatma hızı"
          className="ml-2 rounded-full border border-teal-600/30 px-2 py-1 text-xs font-medium text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
