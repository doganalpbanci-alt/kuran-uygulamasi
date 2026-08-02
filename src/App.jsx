import { useEffect, useState } from "react";
import { ENTRIES } from "./lib/dataStore";
import SurahList from "./components/SurahList";
import StreakSummary from "./components/StreakSummary";
import ReadingScreen from "./components/ReadingScreen";
import SyncMode from "./components/SyncMode";
import SettingsScreen from "./components/SettingsScreen";
import { getCurrentStreak, getLast7Days } from "./lib/streak";
import { getPrefs, updatePrefs } from "./lib/prefs";
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

function Home({ onSelectSurah, onOpenSettings }) {
  const [streak, setStreak] = useState(getCurrentStreak);
  const [last7Days, setLast7Days] = useState(getLast7Days);
  const [order, setOrder] = useState(() => getPrefs().surahOrder);

  useEffect(() => {
    setStreak(getCurrentStreak());
    setLast7Days(getLast7Days());
  }, []);

  const changeOrder = (next) => {
    setOrder(next);
    updatePrefs({ surahOrder: next });
  };

  return (
    <div className="flex min-h-full flex-col px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-cream-100">
          Günlük Kur'an
        </h1>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Ayarlar"
          className="text-xl text-ink-700/60 dark:text-cream-200/60"
        >
          ⚙
        </button>
      </div>

      <StreakSummary streak={streak} last7Days={last7Days} />

      <div
        role="group"
        aria-label="Sıralama"
        className="mt-6 flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
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

      <div className="mt-3">
        <SurahList
          surahs={sortEntries(ENTRIES, order)}
          showRevelationOrder={order === "revelation"}
          onSelectSurah={onSelectSurah}
        />
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

  useEffect(() => {
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedSurah =
    ENTRIES.find((s) => String(s.id) === String(selectedSurahId)) ?? null;

  if (screen === "reading" && selectedSurah) {
    return (
      <ReadingScreen surah={selectedSurah} onBack={() => setScreen("home")} />
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

  return (
    <Home
      onSelectSurah={(id) => {
        setSelectedSurahId(id);
        setScreen("reading");
      }}
      onOpenSettings={() => setScreen("settings")}
    />
  );
}
