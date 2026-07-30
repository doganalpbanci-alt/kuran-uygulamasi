import { useMemo, useState } from "react";
import { getVersesWithOverrides } from "../lib/verses";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { markSurahCompleted } from "../lib/streak";
import { getReciter, reciterLabel } from "../lib/recitation";
import { getTranslation } from "../lib/translations";
import ArabicReader from "./ArabicReader";
import MealView from "./MealView";
import MealListener from "./MealListener";

const TABS = [
  { id: "arabic-meal", label: "Arapça + Meal" },
  { id: "translit", label: "Okunuş" },
  { id: "meal", label: "Meal" },
];

export default function ReadingScreen({ surah, onBack, onOpenSync }) {
  const verses = useMemo(() => getVersesWithOverrides(surah), [surah]);
  const [tab, setTab] = useState(() => getPrefs().tab);
  const [mealAudio, setMealAudio] = useState(false);

  const reciter = getReciter(getPrefs().reciterId);
  const translation = getTranslation(getPrefs().translationId);

  const changeTab = (next) => {
    setTab(next);
    setMealAudio(false);
    updatePrefs({ tab: next });
  };

  const activeTab = TABS.some((t) => t.id === tab) ? tab : "arabic-meal";
  // Oynatıcı ekranın altına sabitlendiği için içeriğin son satırı onun
  // altında kalmasın diye boşluk bırakıyoruz.
  const hasPlayer = activeTab !== "meal" || mealAudio;

  return (
    <div
      className={`flex min-h-full flex-col ${
        hasPlayer ? "pb-[13rem]" : "pb-8"
      }`}
    >
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

      <div
        role="tablist"
        aria-label="Görünüm"
        className="mx-4 mt-3 flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => changeTab(t.id)}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
              activeTab === t.id
                ? "bg-teal-600 text-cream-50 shadow-sm"
                : "text-teal-700 dark:text-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="px-4 pt-2 text-center text-xs text-ink-700/60 dark:text-cream-200/60">
        {activeTab === "meal"
          ? translation.name
          : `${reciterLabel(reciter)}${
              activeTab === "arabic-meal" ? ` · ${translation.name}` : ""
            }`}
      </p>

      {activeTab === "meal" && !mealAudio && (
        <button
          type="button"
          onClick={() => setMealAudio(true)}
          className="mx-auto mt-3 rounded-full border border-teal-600/30 px-4 py-1.5 text-xs text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          ▶ Meali dinle
        </button>
      )}

      {activeTab === "meal" ? (
        mealAudio ? (
          <MealListener
            key="meal-listen"
            surah={surah}
            verses={verses}
            translationId={translation.id}
          />
        ) : (
          <MealView
            key="meal-read"
            verses={verses}
            translationId={translation.id}
          />
        )
      ) : (
        <ArabicReader
          key={`${activeTab}-${reciter.id}`}
          surah={surah}
          verses={verses}
          reciter={reciter}
          layout={activeTab === "translit" ? "translit-arabic" : "arabic-meal"}
          translationId={translation.id}
        />
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
