/**
 * Ayetin Arapça metnini kelime kelime gösterir. Kelime zaman damgaları
 * gerçek olduğu için (quran.com segments) vurgulanan kelime tahmin değil,
 * sesin tam olarak okuduğu kelimedir.
 *
 * timeMs null ise (o ayet çalmıyorsa) metin sade gösterilir. Kaynakta
 * zaman damgası olmayan kelimeler vurgulanmaz ama normal görünür.
 */
export default function ArabicVerse({ words, timeMs }) {
  if (!words?.length) return null;

  const tracking = timeMs != null;

  return (
    <p
      dir="rtl"
      lang="ar"
      className="text-right font-[var(--font-arabic)] text-[calc(1.5rem*var(--font-scale,1))] leading-[2.1] text-ink-900 dark:text-cream-100"
    >
      {words.map((w, i) => {
        if (!tracking || w.start == null) {
          return <span key={i}>{w.text} </span>;
        }
        const isCurrent = timeMs >= w.start && timeMs < w.end;
        const isPast = timeMs >= w.end;
        return (
          <span
            key={i}
            className={
              isCurrent
                ? "rounded bg-gold-500/45"
                : isPast
                  ? ""
                  : "text-ink-900/40 dark:text-cream-100/40"
            }
          >
            {w.text}{" "}
          </span>
        );
      })}
    </p>
  );
}
