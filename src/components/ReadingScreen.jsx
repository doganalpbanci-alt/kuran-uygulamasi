import { useMemo, useState } from "react";
import { getVersesWithOverrides } from "../lib/verses";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { getLastReadDate, markSurahCompleted } from "../lib/streak";
import { localDateString } from "../lib/storage";
import { continuousUrl, getReciter, reciterLabel } from "../lib/recitation";
import { getTranslation } from "../lib/translations";
import { useScrollDirection } from "../hooks/useScrollDirection";
import ArabicReader from "./ArabicReader";
import ContinuousReader from "./ContinuousReader";
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
  const [marked, setMarked] = useState(
    () => getLastReadDate(surah.id) === localDateString(),
  );
  const headerVisible = useScrollDirection();

  const reciter = getReciter(getPrefs().reciterId);
  const translation = getTranslation(getPrefs().translationId);

  // Sürekli tilavet yalnızca tam surelerde var; Âmenerrasûlü gibi kısmi
  // bölümlerde dosya Bakara'nın tamamı olurdu, o yüzden ayet ayet moda
  // düşülüyor.
  const contUrl =
    getPrefs().recitationMode === "continuous"
      ? continuousUrl(surah, reciter.id)
      : null;

  const changeTab = (next) => {
    setTab(next);
    setMealAudio(false);
    updatePrefs({ tab: next });
  };

  const activeTab = TABS.some((t) => t.id === tab) ? tab : "arabic-meal";
  // Oynatıcı ekranın altına sabitlendiği için içeriğin son satırı onun
  // altında kalmasın diye boşluk bırakıyoruz.
  const hasPlayer = activeTab !== "meal" || (mealAudio && Boolean(surah.audio));

  return (
    <div
      className={`flex min-h-full flex-col ${
        hasPlayer ? "pb-[13rem]" : "pb-8"
      }`}
    >
      {/* Okurken yer kaplamasın diye aşağı kaydırırken gizlenir, yukarı
          kaydırınca geri gelir — sayfanın sonundan başa dönmek için ta
          yukarı kaydırmak gerekmesin. */}
      <div
        className={`sticky top-0 z-30 flex items-center justify-between border-b border-teal-700/10 bg-cream-50/95 px-4 py-3 backdrop-blur transition-transform duration-200 dark:border-cream-200/10 dark:bg-[#14211c]/95 ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Sureler
        </button>
        <h1 className="truncate px-2 text-base font-semibold text-ink-900 dark:text-cream-100">
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

      {/* Meal sesi sure başına tek dosya; sure ortasından alınan
          bölümlerde (Âmenerrasûlü) böyle bir kayıt yok. */}
      {activeTab === "meal" && !mealAudio && surah.audio && (
        <button
          type="button"
          onClick={() => setMealAudio(true)}
          className="mx-auto mt-3 rounded-full border border-teal-600/30 px-4 py-1.5 text-xs text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          ▶ Meali dinle
        </button>
      )}

      {activeTab === "meal" ? (
        mealAudio && surah.audio ? (
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
      ) : contUrl ? (
        <ContinuousReader
          key={`cont-${activeTab}-${reciter.id}`}
          surah={surah}
          verses={verses}
          reciter={reciter}
          url={contUrl}
          layout={activeTab === "translit" ? "translit-arabic" : "arabic-meal"}
          translationId={translation.id}
        />
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

      {/* Buton localStorage'a yazıyordu ama ekranda hiçbir şey değişmediği
          için çalışmıyor gibi duruyordu; artık işaretlendiğini gösteriyor. */}
      <button
        type="button"
        onClick={() => {
          markSurahCompleted(surah.id);
          setMarked(true);
        }}
        aria-pressed={marked}
        className={`mx-auto mb-8 mt-2 block rounded-full px-5 py-2 text-sm transition ${
          marked
            ? "bg-teal-600 text-cream-50"
            : "border border-teal-600/30 text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        }`}
      >
        {marked ? "✓ Bugün okundu olarak işaretlendi" : "Okudum olarak işaretle"}
      </button>
    </div>
  );
}
