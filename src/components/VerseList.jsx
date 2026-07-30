import ArabicVerse from "./ArabicVerse";
import { translationText } from "../lib/translations";

/**
 * Tilavet eşliğindeki iki sekmenin ortak ayet listesi.
 *
 * layout:
 *   "arabic-meal"    — Arapça üstte, altında seçili meal
 *   "translit-arabic" — Arapça üstte, altında Latin okunuşu (takip için)
 *
 * Aktif ayet çalan dosyadır, kelime vurgusu gerçek zaman damgalarından gelir.
 */
export default function VerseList({
  verses,
  layout,
  translationId,
  activeIndex,
  arabicWordsFor,
  arabicTimeMs,
  isPlaying,
  onSelectVerse,
  verseRefs,
}) {
  return (
    <div className="flex-1 space-y-5 px-5 py-6">
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
                {verse.arabic_words?.length > 0 && (
                  <ArabicVerse
                    words={arabicWordsFor(verse)}
                    timeMs={isActive && isPlaying ? arabicTimeMs : null}
                  />
                )}

                {layout === "translit-arabic" ? (
                  <p className="mt-2 font-[var(--font-reading)] text-base leading-relaxed text-ink-700/80 dark:text-cream-200/70">
                    {verse.transcription}
                  </p>
                ) : (
                  <p className="mt-2 font-[var(--font-reading)] text-base leading-relaxed text-ink-900 dark:text-cream-100">
                    {translationText(verse, translationId)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
