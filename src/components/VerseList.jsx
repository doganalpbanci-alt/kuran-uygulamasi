import ArabicVerse from "./ArabicVerse";
import TrackedTranscription from "./TrackedTranscription";

/**
 * Ayet listesi. İki modda da aynı bileşen kullanılır; fark, aktif ayetin
 * nasıl belirlendiği ve kelime imlecinin nereden beslendiğidir:
 *
 *  - tilavet modunda aktif ayet zaten çalan dosyadır, kelime vurgusu
 *    gerçek zaman damgalarından gelir (arabicTimeMs).
 *  - meal modunda aktif ayet start_time'lardan hesaplanır, kelime vurgusu
 *    ayet içi ilerlemeden tahmin edilir (transcriptionProgress).
 */
export default function VerseList({
  verses,
  activeIndex,
  showArabic,
  arabicWordsFor,
  arabicTimeMs,
  transcriptionProgress,
  wordCursorEnabled,
  isPlaying,
  onSelectVerse,
  verseRefs,
}) {
  return (
    <div className="flex-1 space-y-6 px-5 py-6">
      {verses.map((verse, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={verse.verse_number}
            ref={(el) => {
              verseRefs.current[i] = el;
            }}
            className={`rounded-xl px-3 py-3 transition-colors ${
              isActive ? "bg-gold-500/15 ring-1 ring-gold-500/40" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectVerse(i)}
                aria-label={`${verse.verse_number}. ayetten oynat`}
                className="mt-1.5 shrink-0 rounded px-1 text-xs font-medium text-teal-700/70 hover:bg-teal-600/10 dark:text-gold-500/70"
              >
                {verse.verse_number}
              </button>

              <div className="min-w-0 flex-1">
                {showArabic && verse.arabic_words?.length > 0 && (
                  <ArabicVerse
                    words={arabicWordsFor(verse)}
                    timeMs={isActive && isPlaying ? arabicTimeMs : null}
                  />
                )}

                <p
                  className={`font-[var(--font-reading)] leading-relaxed text-ink-900 dark:text-cream-100 ${
                    showArabic ? "mt-2 text-base" : "text-xl"
                  }`}
                >
                  <TrackedTranscription
                    text={verse.transcription}
                    progress={isActive ? transcriptionProgress : 0}
                    enabled={
                      wordCursorEnabled && isActive && isPlaying && !showArabic
                    }
                  />
                </p>

                <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70 dark:text-cream-200/60">
                  {verse.translation}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
