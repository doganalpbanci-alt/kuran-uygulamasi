import { useMemo } from "react";
import { splitIntoWords } from "../lib/verses";

/**
 * Aktif ayetin okunuşunu kelime kelime gösterir ve sesin bulunduğu
 * kelimeyi vurgular. Kelime zaman damgası olmadığı için konum, ayet
 * içindeki ilerlemeden kelime uzunluklarına göre tahmin edilir; bu yüzden
 * yaklaşıktır. Ayetin start_time değerleri senkron modunda girildikçe
 * isabet belirgin şekilde artar.
 */
export default function TrackedTranscription({ text, progress, enabled }) {
  const words = useMemo(() => splitIntoWords(text), [text]);

  if (!enabled) return text;

  return words.map((w, i) => {
    if (w.isSpace) return w.word;
    const isCurrent = progress >= w.start && progress < w.end;
    const isPast = progress >= w.end;

    return (
      <span
        key={i}
        className={
          isCurrent
            ? "rounded bg-gold-500/45 text-ink-900 dark:text-cream-50"
            : isPast
              ? "text-ink-900 dark:text-cream-100"
              : "text-ink-900/45 dark:text-cream-100/45"
        }
      >
        {w.word}
      </span>
    );
  });
}
