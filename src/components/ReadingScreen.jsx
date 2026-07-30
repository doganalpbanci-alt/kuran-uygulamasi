import { useMemo, useState } from "react";
import { getVersesWithOverrides } from "../lib/verses";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { markSurahCompleted } from "../lib/streak";
import { getReciter, reciterLabel } from "../lib/recitation";
import ReadingView from "./ReadingView";
import ArabicReader from "./ArabicReader";
import MealReader from "./MealReader";

const MODES = [
  { id: "read", label: "Okuma" },
  { id: "listen", label: "Dinleme" },
];

const SOURCES = [
  { id: "arabic", label: "Arapça tilavet" },
  { id: "meal", label: "Türkçe meal sesi" },
];

function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
            value === opt.id
              ? "bg-teal-600 text-cream-50 shadow-sm"
              : "text-teal-700 dark:text-cream-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ReadingScreen({ surah, onBack, onOpenSync }) {
  const verses = useMemo(() => getVersesWithOverrides(surah), [surah]);
  const [mode, setMode] = useState(() => getPrefs().mode);
  const [source, setSource] = useState(() => getPrefs().audioMode);
  const reciter = getReciter(getPrefs().reciterId);

  const hasArabic = verses.some((v) => v.arabic_words?.length > 0);
  const effectiveSource = hasArabic ? source : "meal";

  const changeMode = (next) => {
    setMode(next);
    updatePrefs({ mode: next });
  };

  const changeSource = (next) => {
    setSource(next);
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

      <div className="mx-4 mt-3">
        <Segmented
          options={MODES}
          value={mode}
          onChange={changeMode}
          ariaLabel="Okuma veya dinleme"
        />
      </div>

      {mode === "listen" && hasArabic && (
        <div className="mx-4 mt-2">
          <Segmented
            options={SOURCES}
            value={effectiveSource}
            onChange={changeSource}
            ariaLabel="Ses kaynağı"
          />
        </div>
      )}

      {mode === "listen" && effectiveSource === "arabic" && (
        <p className="px-4 pt-2 text-center text-xs text-ink-700/60 dark:text-cream-200/60">
          {reciterLabel(reciter)}
        </p>
      )}

      {mode === "read" ? (
        <ReadingView key="read" verses={verses} />
      ) : effectiveSource === "arabic" ? (
        <ArabicReader
          key={`arabic-${reciter.id}`}
          surah={surah}
          verses={verses}
          reciter={reciter}
        />
      ) : (
        <MealReader key="meal" surah={surah} verses={verses} />
      )}

      <button
        type="button"
        onClick={() => markSurahCompleted(surah.id)}
        className="mx-auto mb-8 mt-2 block rounded-full border border-teal-600/30 px-5 py-2 text-sm text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
      >
        ✓ Okudum olarak işaretle
      </button>
    </div>
  );
}
