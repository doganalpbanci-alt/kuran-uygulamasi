import ArabicVerse from "./ArabicVerse";
import { getTimedWords } from "../lib/recitation";

/**
 * Sessiz okuma modu: ses yok, senkron yok. Ayet ayet önce Türkçe meal,
 * altında Arapça metin, en altta Latin okunuşu.
 *
 * Ses eşliğinde okumak isteyen Dinleme moduna geçer; bu ekranın tek işi
 * metni rahat okunur biçimde göstermek.
 */
export default function ReadingView({ verses }) {
  return (
    <div className="flex-1 divide-y divide-teal-700/10 px-5 py-4 dark:divide-cream-200/10">
      {verses.map((verse) => (
        <article key={verse.verse_number} className="py-5">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 rounded-full bg-teal-600/10 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-white/10 dark:text-gold-500">
              {verse.verse_number}
            </span>
          </div>

          {/* Türkçe meal önde ve en okunaklı olan */}
          <p className="mt-2 font-[var(--font-reading)] text-lg leading-relaxed text-ink-900 dark:text-cream-100">
            {verse.translation}
          </p>

          {/* Arapça altta */}
          {verse.arabic_words?.length > 0 && (
            <div className="mt-3">
              <ArabicVerse words={getTimedWords(verse, null)} timeMs={null} />
            </div>
          )}

          <p className="mt-2 text-sm leading-relaxed text-ink-700/60 dark:text-cream-200/50">
            {verse.transcription}
          </p>
        </article>
      ))}
    </div>
  );
}
