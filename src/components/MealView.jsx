import { useMemo } from "react";
import {
  groupByTranslation,
  rangeLabel,
  stripRangePrefix,
} from "../lib/translations";

/**
 * Kesintisiz meal okuma. Arapça ve okunuş yok; tek işi meali akıcı bir
 * metin gibi okutmak.
 *
 * Birden çok ayeti tek cümlede çeviren mealler o metni aralıktaki her ayete
 * tekrar yazıyor. Burada ardışık aynı metinler tek bloğa toplanıp "3-7"
 * gibi tek bir aralık etiketiyle gösteriliyor, böylece aynı paragraf art
 * arda tekrar etmiyor.
 */
export default function MealView({ verses, translationId }) {
  const groups = useMemo(
    () => groupByTranslation(verses, translationId),
    [verses, translationId],
  );

  return (
    <div className="flex-1 px-6 py-4">
      {groups.map((group) => (
        <section key={group.from} className="mb-6">
          <span className="text-xs font-medium text-teal-700/70 dark:text-gold-500/70">
            {rangeLabel(group)}
          </span>
          <p className="mt-1 font-[var(--font-reading)] text-lg leading-[1.85] text-ink-900 dark:text-cream-100">
            {stripRangePrefix(group.text)}
          </p>
        </section>
      ))}
    </div>
  );
}
