import { useMemo, useState } from "react";
import { getVersesWithOverrides } from "../lib/verses";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { markSurahCompleted } from "../lib/streak";
import ArabicReader from "./ArabicReader";
import MealReader from "./MealReader";

export default function ReadingScreen({ surah, onBack, onOpenSync }) {
  const verses = useMemo(() => getVersesWithOverrides(surah), [surah]);
  const [mode, setMode] = useState(() => getPrefs().audioMode);

  const hasArabic = verses.some((v) => v.arabic?.url);
  const effectiveMode = hasArabic ? mode : "meal";

  const changeMode = (next) => {
    setMode(next);
    updatePrefs({ audioMode: next });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Sureler
        </button>
        <h1 className="text-base font-semibold text-ink-900 dark:text-cream-100">
          {surah.name}
        </h1>
        <button
          type="button"
          onClick={onOpenSync}
          aria-label="Senkron modu"
          className="text-sm text-ink-700/50 dark:text-cream-200/50"
        >
          ⚙
        </button>
      </div>

      {hasArabic && (
        <div
          role="group"
          aria-label="Ses kaynağı"
          className="mx-4 mt-3 flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
        >
          {[
            { id: "arabic", label: "Arapça tilavet" },
            { id: "meal", label: "Türkçe meal" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => changeMode(opt.id)}
              aria-pressed={effectiveMode === opt.id}
              className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
                effectiveMode === opt.id
                  ? "bg-teal-600 text-cream-50 shadow-sm"
                  : "text-teal-700 dark:text-cream-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Mod değişince oynatıcı sıfırdan kurulsun diye key veriyoruz. */}
      {effectiveMode === "arabic" ? (
        <ArabicReader key="arabic" surah={surah} verses={verses} />
      ) : (
        <MealReader key="meal" surah={surah} verses={verses} />
      )}

      <button
        type="button"
        onClick={() => markSurahCompleted(surah.id)}
        className="mx-auto mb-6 block rounded-full border border-teal-600/30 px-5 py-2 text-sm text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
      >
        ✓ Okudum olarak işaretle
      </button>
    </div>
  );
}
