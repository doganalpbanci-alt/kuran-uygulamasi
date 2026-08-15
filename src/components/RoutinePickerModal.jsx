import { useState } from "react";
import { TIME_TAGS } from "../lib/dailyRecitations";
import { getRoutineItems, toggleRoutineTag } from "../lib/routine";

/**
 * Bir sure/dua için hangi vakit rutinlerine (sabah/gece/gün içi) dahil
 * olduğunu seçmeye yarayan küçük bir alt sayfa. Sureler ekranından da,
 * Günlük Okumalar'dan da aynı şekilde çağrılır.
 */
export default function RoutinePickerModal({ type, refId, title, onClose }) {
  const [tags, setTags] = useState(() => {
    const item = getRoutineItems().find(
      (it) => it.type === type && String(it.refId) === String(refId),
    );
    return new Set(item?.tags ?? []);
  });

  const handleToggle = (tagId) => {
    toggleRoutineTag(tagId, type, refId);
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-sm rounded-t-2xl bg-cream-50 p-5 shadow-lg dark:bg-ink-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          {title}
        </h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Hangi rutin(ler)e eklensin? Birden fazla seçebilirsin.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {TIME_TAGS.map((t) => {
            const active = tags.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToggle(t.id)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-teal-600/40 bg-teal-600/10 text-teal-700 dark:border-gold-500/40 dark:bg-gold-500/10 dark:text-gold-500"
                    : "border-teal-600/15 text-ink-700/70 dark:border-cream-200/15 dark:text-cream-200/70"
                }`}
              >
                {t.label}
                <span>{active ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-cream-50 dark:bg-gold-500 dark:text-ink-900"
        >
          Bitti
        </button>
      </div>
    </div>
  );
}
