import { useEffect, useState } from "react";
import { ENTRIES } from "./lib/dataStore";
import SurahList from "./components/SurahList";
import StreakSummary from "./components/StreakSummary";
import ReadingScreen from "./components/ReadingScreen";
import SyncMode from "./components/SyncMode";
import SettingsScreen from "./components/SettingsScreen";
import BookmarksScreen from "./components/BookmarksScreen";
import DailyRecitationsScreen from "./components/DailyRecitationsScreen";
import AddDailyItemScreen from "./components/AddDailyItemScreen";
import DhikrDetailScreen from "./components/DhikrDetailScreen";
import { getCurrentStreak, getLast7Days } from "./lib/streak";
import { getPrefs, updatePrefs } from "./lib/prefs";
import { isFavorite } from "./lib/favorites";
import { checkAndNotify } from "./lib/notifications";

/**
 * Nüzûl sırası, surelerin indirilme sırası — mushaf sırasından farklı.
 * Kısmi bölümlerin (Âmenerrasûlü) kendi nüzûl sırası yok; ait olduğu
 * surenin sırasını kullanıp listenin sonuna yakın tutuyoruz.
 */
function sortEntries(entries, order) {
  if (order !== "revelation") return entries;
  return [...entries].sort(
    (a, b) => (a.revelation_order ?? 999) - (b.revelation_order ?? 999),
  );
}

function Home({ onSelectSurah, onOpenSettings, onOpenBookmarks, onOpenDaily }) {
  const [streak, setStreak] = useState(getCurrentStreak);
  const [last7Days, setLast7Days] = useState(getLast7Days);
  const [order, setOrder] = useState(() => getPrefs().surahOrder);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    setStreak(getCurrentStreak());
    setLast7Days(getLast7Days());
  }, []);

  const changeOrder = (next) => {
    setOrder(next);
    updatePrefs({ surahOrder: next });
  };

  const sorted = sortEntries(ENTRIES, order);
  const visible = favoritesOnly
    ? sorted.filter((s) => isFavorite(s.id))
    : sorted;

  return (
    <div className="flex min-h-full flex-col px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-cream-100">
          Günlük Kur'an
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDaily}
            aria-label="Günlük okumalar"
            className="text-xl text-ink-700/60 dark:text-cream-200/60"
          >
            📿
          </button>
          <button
            type="button"
            onClick={onOpenBookmarks}
            aria-label="Yer işaretlerim"
            className="text-xl text-ink-700/60 dark:text-cream-200/60"
          >
            🔖
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ayarlar"
            className="text-xl text-ink-700/60 dark:text-cream-200/60"
          >
            ⚙
          </button>
        </div>
      </div>

      <StreakSummary streak={streak} last7Days={last7Days} />

      <div className="mt-6 flex items-center gap-2">
        <div
          role="group"
          aria-label="Sıralama"
          className="flex flex-1 rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
        >
          {[
            { id: "mushaf", label: "Mushaf sırası" },
            { id: "revelation", label: "Nüzûl sırası" },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => changeOrder(o.id)}
              aria-pressed={order === o.id}
              className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
                order === o.id
                  ? "bg-teal-600 text-cream-50 shadow-sm"
                  : "text-teal-700 dark:text-cream-100"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            favoritesOnly
              ? "bg-gold-500/20 text-gold-500 ring-1 ring-gold-500/40"
              : "bg-teal-600/10 text-teal-700 dark:bg-white/5 dark:text-cream-100"
          }`}
        >
          ★ İşaretlenenler
        </button>
      </div>

      <div className="mt-3">
        {visible.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
            Henüz işaretlenen sure yok. Sure kartındaki ☆ ile ekleyebilirsin.
          </p>
        ) : (
          <SurahList
            surahs={visible}
            showRevelationOrder={order === "revelation"}
            onSelectSurah={onSelectSurah}
          />
        )}
      </div>
    </div>
  );
}

function SyncPicker({ onSelectSurah, onBack }) {
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
        <h1 className="text-base font-semibold text-ink-900 dark:text-cream-100">
          Sure seç
        </h1>
        <span className="w-10" />
      </div>
      <div className="mt-4">
        <SurahList surahs={ENTRIES} onSelectSurah={onSelectSurah} />
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [selectedSurahId, setSelectedSurahId] = useState(null);
  // Yer İşaretlerim'den açılan bir ayete o an içindeki bölüm okunmaya
  // başlarken kaydırıp vurgulamak için.
  const [focusVerse, setFocusVerse] = useState(null);
  // Günlük Okumalar'dan açılan hadis kaynaklı zikir/dua.
  const [selectedDhikr, setSelectedDhikr] = useState(null);
  // Okuma ekranından geri dönülecek ekran (nereden açıldıysa).
  const [returnScreen, setReturnScreen] = useState("home");
  // Rutine sure/dua ekleme ekranının hangi vakit için açıldığı.
  const [addRoutineTag, setAddRoutineTag] = useState(null);

  useEffect(() => {
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const openSurah = (id, verse = null, from = "home") => {
    setSelectedSurahId(id);
    setFocusVerse(verse);
    setReturnScreen(from);
    setScreen("reading");
  };

  const selectedSurah =
    ENTRIES.find((s) => String(s.id) === String(selectedSurahId)) ?? null;

  if (screen === "reading" && selectedSurah) {
    return (
      <ReadingScreen
        surah={selectedSurah}
        focusVerse={focusVerse}
        onBack={() => setScreen(returnScreen)}
      />
    );
  }

  if (screen === "sync" && selectedSurah) {
    return (
      <SyncMode surah={selectedSurah} onBack={() => setScreen("reading")} />
    );
  }

  if (screen === "sync-picker") {
    return (
      <SyncPicker
        onSelectSurah={(id) => {
          setSelectedSurahId(id);
          setScreen("sync");
        }}
        onBack={() => setScreen("settings")}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        onBack={() => setScreen("home")}
        onOpenSyncPicker={() => setScreen("sync-picker")}
      />
    );
  }

  if (screen === "bookmarks") {
    return (
      <BookmarksScreen
        onBack={() => setScreen("home")}
        onOpenBookmark={(surahId, verseNumber) =>
          openSurah(surahId, verseNumber, "bookmarks")
        }
      />
    );
  }

  if (screen === "dhikr-detail" && selectedDhikr) {
    return (
      <DhikrDetailScreen
        item={selectedDhikr}
        onBack={() => setScreen("daily")}
      />
    );
  }

  if (screen === "daily-add" && addRoutineTag) {
    return (
      <AddDailyItemScreen
        tag={addRoutineTag}
        onBack={() => setScreen("daily")}
      />
    );
  }

  if (screen === "daily") {
    return (
      <DailyRecitationsScreen
        onBack={() => setScreen("home")}
        onOpenAdd={(tag) => {
          setAddRoutineTag(tag);
          setScreen("daily-add");
        }}
        onOpenSurah={(id) => openSurah(id, null, "daily")}
        onOpenDhikr={(item) => {
          setSelectedDhikr(item);
          setScreen("dhikr-detail");
        }}
      />
    );
  }

  return (
    <Home
      onSelectSurah={(id) => openSurah(id)}
      onOpenSettings={() => setScreen("settings")}
      onOpenBookmarks={() => setScreen("bookmarks")}
      onOpenDaily={() => setScreen("daily")}
    />
  );
}
