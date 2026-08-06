/**
 * Hadis kaynaklı tek bir zikir/dua için detay ekranı. Kur'an tabanlı
 * öğeler (İhlâs, Âyetü'l-Kürsî vb.) buraya değil, mevcut ReadingScreen'e
 * yönlendirilir — metin doğrulanmış Kur'an hattından geldiği için ayrı
 * bir gösterim gerekmiyor.
 */
export default function DhikrDetailScreen({ item, onBack }) {
  return (
    <div className="flex min-h-full flex-col px-5 py-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Geri
        </button>
        <h1 className="truncate px-2 text-base font-semibold text-ink-900 dark:text-cream-100">
          {item.name}
        </h1>
        <span className="w-10" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-700/60 dark:text-cream-200/60">
        <span>{item.occasion}</span>
        <span className="rounded-full bg-teal-600/10 px-2.5 py-0.5 font-medium text-teal-700 dark:bg-white/10 dark:text-gold-500">
          {item.repeat}
        </span>
      </div>

      <div className="mt-6 flex-1 px-1">
        <p
          dir="rtl"
          lang="ar"
          className="text-right font-[var(--font-arabic)] text-[calc(1.75rem*var(--font-scale,1))] leading-[2.2] text-ink-900 dark:text-cream-100"
        >
          {item.arabic}
        </p>

        <p className="mt-5 font-[var(--font-reading)] text-[calc(1rem*var(--font-scale,1))] leading-relaxed text-ink-700/80 dark:text-cream-200/70">
          {item.transliteration}
        </p>

        <p className="mt-4 font-[var(--font-reading)] text-[calc(1rem*var(--font-scale,1))] leading-relaxed text-ink-900 dark:text-cream-100">
          {item.meaning}
        </p>
      </div>

      <p className="mt-6 border-t border-teal-600/10 pt-3 text-xs leading-relaxed text-ink-700/50 dark:border-cream-200/10 dark:text-cream-200/45">
        Kaynak: {item.source}
      </p>
    </div>
  );
}
