import { useMemo, useState } from "react";
import { useVerses } from "../hooks/useEntryData";
import { TAFSIRS } from "../lib/dataStore";
import { getVersesWithOverrides } from "../lib/verses";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { getLastReadDate, markSurahCompleted } from "../lib/streak";
import { localDateString } from "../lib/storage";
import { isFavorite, toggleFavorite } from "../lib/favorites";
import {
  continuousUrl,
  getReciter,
  reciterLabel,
  reciterSync,
} from "../lib/recitation";
import { getTranslation } from "../lib/translations";
import { useScrollDirection } from "../hooks/useScrollDirection";
import ArabicReader from "./ArabicReader";
import ContinuousReader from "./ContinuousReader";
import MealView from "./MealView";
import MealListener from "./MealListener";
import QuickSettings from "./QuickSettings";
import TafsirScreen from "./TafsirScreen";

const TABS = [
  { id: "arabic-meal", label: "Arapça + Meal" },
  { id: "translit", label: "Okunuş" },
  { id: "meal", label: "Meal" },
];

export default function ReadingScreen({ surah, onBack, focusVerse = null }) {
  // Ayet verisi uygulamayla paketlenmiyor, bölüm açıldığında iniyor.
  const { verses: loaded, error } = useVerses(surah.id);
  const verses = useMemo(
    () => (loaded ? getVersesWithOverrides({ ...surah, verses: loaded }) : []),
    [surah, loaded],
  );

  const tafsirId = getPrefs().tafsirId ?? TAFSIRS[0]?.id ?? null;
  const [tafsirFocus, setTafsirFocus] = useState(null);
  // Yer İşaretlerim'den bir ayete gelindiğinde meal sekmesi ayetleri tek tek
  // göstermiyor (aralık gruplu); o ayeti görebilmek için ayet ayet bir
  // sekmeye düşülüyor.
  const [tab, setTab] = useState(() => {
    const saved = getPrefs().tab;
    return focusVerse != null && saved === "meal" ? "arabic-meal" : saved;
  });
  const [mealAudio, setMealAudio] = useState(false);
  const [marked, setMarked] = useState(
    () => getLastReadDate(surah.id) === localDateString(),
  );
  const [favorite, setFavorite] = useState(() => isFavorite(surah.id));
  const headerVisible = useScrollDirection();

  // Kari ve meal state'te tutuluyor ki hızlı seçim panelinden değişince
  // ekran anında yenilensin.
  const [reciterId, setReciterId] = useState(
    () => getReciter(getPrefs().reciterId).id,
  );
  const [translationId, setTranslationId] = useState(
    () => getTranslation(getPrefs().translationId).id,
  );
  const [quickOpen, setQuickOpen] = useState(false);

  const reciter = getReciter(reciterId);
  const translation = getTranslation(translationId);

  // Sürekli tilavet yalnızca tam surelerde var; Âmenerrasûlü gibi kısmi
  // bölümlerde dosya Bakara'nın tamamı olurdu, o yüzden ayet ayet moda
  // düşülüyor. Ayet ayet kaydı olmayan karilerde (sync "none") tek seçenek
  // sürekli kayıttır, ayar ne olursa olsun.
  const sync = reciterSync(reciter);
  const wantsContinuous =
    sync === "none" || getPrefs().recitationMode === "continuous";
  const contUrl = wantsContinuous ? continuousUrl(surah, reciter.id) : null;
  // Sadece sure kaydı olan bir kari, kısmi bölümde hiç çalınamaz.
  const reciterUnavailable = sync === "none" && !contUrl;

  const changeTab = (next) => {
    setTab(next);
    setMealAudio(false);
    updatePrefs({ tab: next });
  };

  const activeTab = TABS.some((t) => t.id === tab) ? tab : "arabic-meal";
  // Oynatıcı ekranın altına sabitlendiği için içeriğin son satırı onun
  // altında kalmasın diye boşluk bırakıyoruz.
  const hasPlayer =
    (activeTab !== "meal" && !reciterUnavailable) ||
    (mealAudio && Boolean(surah.audio));

  if (tafsirFocus !== null) {
    return (
      <TafsirScreen
        surah={surah}
        tafsirId={tafsirId}
        focusVerse={tafsirFocus === "all" ? null : tafsirFocus}
        onBack={() => setTafsirFocus(null)}
      />
    );
  }

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
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setFavorite(toggleFavorite(surah.id).includes(surah.id))
            }
            aria-pressed={favorite}
            aria-label={
              favorite ? "Favorilerden çıkar" : "Favorilere ekle"
            }
            className={`text-lg leading-none ${
              favorite
                ? "text-gold-500"
                : "text-ink-700/40 dark:text-cream-200/40"
            }`}
          >
            {favorite ? "★" : "☆"}
          </button>
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            aria-label="Kari ve meal seçimi"
            className="text-base text-ink-700/60 dark:text-cream-200/60"
          >
            ⚙
          </button>
        </div>
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

      {!loaded && !error && (
        <p className="flex-1 px-5 py-16 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
          Yükleniyor…
        </p>
      )}

      {error && (
        <div className="flex-1 px-6 py-12 text-center">
          <p className="text-sm leading-relaxed text-ink-700/70 dark:text-cream-200/60">
            Bu bölümün metni indirilemedi. İlk açılışta internet gerekiyor;
            bir kez indirildikten sonra çevrimdışı da açılır.
          </p>
        </div>
      )}

      {loaded && (activeTab === "meal" ? (
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
      ) : reciterUnavailable ? (
        <div className="flex-1 px-6 py-8">
          <p className="text-sm leading-relaxed text-ink-700/70 dark:text-cream-200/60">
            {reciter.name} bu bölümde kullanılamıyor: bu kariden yalnızca sure
            başına tek kayıt var, Âmenerrasûlü ise Bakara'nın içinden iki ayet.
            Yukarıdaki ⚙ ile başka bir kari seçebilirsiniz.
          </p>
        </div>
      ) : contUrl ? (
        <ContinuousReader
          key={`cont-${activeTab}-${reciter.id}`}
          surah={surah}
          verses={verses}
          reciter={reciter}
          url={contUrl}
          layout={activeTab === "translit" ? "translit-arabic" : "arabic-meal"}
          translationId={translation.id}
          focusVerse={focusVerse}
        />
      ) : (
        <ArabicReader
          key={`${activeTab}-${reciter.id}`}
          surah={surah}
          verses={verses}
          reciter={reciter}
          layout={activeTab === "translit" ? "translit-arabic" : "arabic-meal"}
          translationId={translation.id}
          focusVerse={focusVerse}
        />
      ))}

      {/* Mealde takılınan yerde tefsire geçiş. Tefsir ayet ayet değil
          bölüm bölüm olduğu için ayet numarası yalnızca hangi bloğa
          gidileceğini belirtiyor. */}
      {loaded && tafsirId && (
        <button
          type="button"
          onClick={() => setTafsirFocus("all")}
          className="mx-auto mt-2 block rounded-full border border-teal-600/30 px-5 py-2 text-sm text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          Tefsiri aç
        </button>
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

      <QuickSettings
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        reciterId={reciter.id}
        translationId={translation.id}
        onReciterChange={(id) => {
          setReciterId(id);
          updatePrefs({ reciterId: id });
        }}
        onTranslationChange={(id) => {
          setTranslationId(id);
          updatePrefs({ translationId: id });
        }}
      />
    </div>
  );
}
