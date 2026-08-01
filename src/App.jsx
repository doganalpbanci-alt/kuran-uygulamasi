import { useEffect, useState } from "react";
import data from "./data/surahs.json";
import SurahList from "./components/SurahList";
import StreakSummary from "./components/StreakSummary";
import ReadingScreen from "./components/ReadingScreen";
import SyncMode from "./components/SyncMode";
import SettingsScreen from "./components/SettingsScreen";
import { getCurrentStreak, getLast7Days } from "./lib/streak";
import { checkAndNotify } from "./lib/notifications";

const SURAHS = data.surahs;

function Home({ onSelectSurah, onOpenSettings }) {
  const [streak, setStreak] = useState(getCurrentStreak);
  const [last7Days, setLast7Days] = useState(getLast7Days);

  useEffect(() => {
    setStreak(getCurrentStreak());
    setLast7Days(getLast7Days());
  }, []);

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

      <h2 className="mb-2 mt-6 text-sm font-medium text-ink-700/70 dark:text-cream-200/70">
        Sureler
      </h2>
      <SurahList surahs={SURAHS} onSelectSurah={onSelectSurah} />
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
        <SurahList surahs={SURAHS} onSelectSurah={onSelectSurah} />
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

  const selectedSurah = SURAHS.find((s) => s.id === selectedSurahId) ?? null;

  if (screen === "reading" && selectedSurah) {
    return (
      <ReadingScreen
        surah={selectedSurah}
        onBack={() => setScreen("home")}
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
