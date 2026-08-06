import { useEffect, useRef, useState } from "react";
import ArabicVerse from "./ArabicVerse";
import { translationText } from "../lib/translations";
import { getBookmarks, toggleBookmark } from "../lib/bookmarks";

/**
 * Tilavet eşliğindeki iki sekmenin ortak ayet listesi.
 *
 * layout:
 *   "arabic-meal"    — Arapça üstte, altında seçili meal
 *   "translit-arabic" — Arapça üstte, altında Latin okunuşu (takip için)
 *
 * Aktif ayet çalan dosyadır, kelime vurgusu gerçek zaman damgalarından gelir.
 *
 * focusVerse (opsiyonel): Yer İşaretlerim ekranından gelindiğinde o ayete
 * bir kez kaydırıp hafifçe vurgular — çalma imleciyle (altın) karışmasın
 * diye ayrı bir renkte (teal).
 */
export default function VerseList({
  surah,
  verses,
  layout,
  translationId,
  activeIndex,
  arabicWordsFor,
  arabicTimeMs,
  isPlaying,
  onSelectVerse,
  verseRefs,
  focusVerse = null,
}) {
  const [bookmarked, setBookmarked] = useState(
    () =>
      new Set(
        getBookmarks()
          .filter((b) => b.surahId === surah.id)
          .map((b) => b.verseNumber),
      ),
  );

  const focusRef = useRef(null);
  const focusedOnce = useRef(false);

  useEffect(() => {
    if (focusedOnce.current || focusVerse == null || !focusRef.current) return;
    focusedOnce.current = true;
    focusRef.current.scrollIntoView({ behavior: "auto", block: "center" });
  }, [focusVerse, verses]);

  const handleToggleBookmark = (verse) => {
    toggleBookmark(surah.id, verse.verse_number, {
      surahName: surah.name,
      subtitle: surah.subtitle,
      preview: (verse.transcription || "").slice(0, 90),
    });
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(verse.verse_number)) next.delete(verse.verse_number);
      else next.add(verse.verse_number);
      return next;
    });
  };

  return (
    <div className="flex-1 space-y-5 px-5 py-6">
      {verses.map((verse, i) => {
        const isActive = i === activeIndex;
        const isFocused = verse.verse_number === focusVerse;
        const isBookmarked = bookmarked.has(verse.verse_number);
        return (
          <div
            key={verse.verse_number}
            ref={(el) => {
              verseRefs.current[i] = el;
              if (isFocused) focusRef.current = el;
            }}
            className={`scroll-mt-16 rounded-xl transition-colors ${
              isActive
                ? "bg-gold-500/15 ring-1 ring-gold-500/40"
                : isFocused
                  ? "bg-teal-600/10 ring-1 ring-teal-600/40"
                  : ""
            }`}
          >
            <div className="flex items-start gap-1 px-3 py-3">
              <span className="mt-1.5 shrink-0 rounded px-1 text-xs font-medium text-teal-700/70 dark:text-gold-500/70">
                {verse.verse_number}
              </span>

              {/* Metnin tamamı tıklanabilir: dokununca o ayetin başına
                  dönüp oynatır, imleç de oraya senkronlanır. Yer imi
                  düğmesi ayrı tutuluyor ki iki eylem birbirine karışmasın. */}
              <button
                type="button"
                onClick={() => onSelectVerse(i)}
                aria-label={`${verse.verse_number}. ayeti baştan oynat`}
                className="min-w-0 flex-1 text-left"
              >
                {verse.arabic_words?.length > 0 && (
                  <ArabicVerse
                    words={arabicWordsFor(verse)}
                    timeMs={isActive && isPlaying ? arabicTimeMs : null}
                  />
                )}

                {layout === "translit-arabic" && (
                  <p className="mt-2 font-[var(--font-reading)] text-[calc(1rem*var(--font-scale,1))] leading-relaxed text-ink-900 dark:text-cream-100">
                    {verse.transcription}
                  </p>
                )}

                <p
                  className={`font-[var(--font-reading)] leading-relaxed ${
                    layout === "translit-arabic"
                      ? "mt-1.5 text-[calc(0.875rem*var(--font-scale,1))] text-ink-700/70 dark:text-cream-200/55"
                      : "mt-2 text-[calc(1rem*var(--font-scale,1))] text-ink-900 dark:text-cream-100"
                  }`}
                >
                  {translationText(verse, translationId)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleBookmark(verse)}
                aria-pressed={isBookmarked}
                aria-label={
                  isBookmarked
                    ? `${verse.verse_number}. ayetin yer imini kaldır`
                    : `${verse.verse_number}. ayete yer imi koy`
                }
                className={`mt-1 shrink-0 rounded p-1 text-base transition ${
                  isBookmarked
                    ? "text-gold-500"
                    : "text-ink-700/25 hover:text-ink-700/60 dark:text-cream-200/25 dark:hover:text-cream-200/60"
                }`}
              >
                🔖
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
