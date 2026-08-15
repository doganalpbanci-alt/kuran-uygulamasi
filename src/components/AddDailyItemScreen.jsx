import { useState } from "react";
import { ENTRIES } from "../lib/dataStore";
import { DAILY_RECITATIONS } from "../lib/dailyRecitations";
import { getCustomItems, toggleCustomItem } from "../lib/dailyCustomItems";

const TABS = [
  { id: "sure", label: "Sure" },
  { id: "dua", label: "Dua" },
];

const DUALAR = DAILY_RECITATIONS.filter((it) => it.type === "dhikr");

function ToggleRow({ label, subtitle, added, onToggle }) {
  return (
    <li className="flex items-stretch gap-2">
      <div className="flex flex-1 items-center justify-between rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-3 dark:border-cream-200/15 dark:bg-white/5">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
            {label}
          </h3>
          {subtitle && (
            <p className="text-xs text-ink-700/60 dark:text-cream-200/60">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={added}
        aria-label={added ? `${label} eklediklerimden çıkar` : `${label} eklediklerime ekle`}
        className={`shrink-0 rounded-2xl border px-4 text-sm font-medium transition ${
          added
            ? "border-gold-500/40 bg-gold-500/10 text-gold-500"
            : "border-teal-600/25 text-teal-700 dark:border-cream-200/25 dark:text-cream-100"
        }`}
      >
        {added ? "✓ Eklendi" : "+ Ekle"}
      </button>
    </li>
  );
}

export default function AddDailyItemScreen({ onBack }) {
  const [tab, setTab] = useState(TABS[0].id);
  const [customItems, setCustomItems] = useState(getCustomItems);

  const isAdded = (type, refId) =>
    customItems.some(
      (it) => it.type === type && String(it.refId) === String(refId),
    );

  const handleToggle = (type, refId) => {
    setCustomItems(toggleCustomItem(type, refId));
  };

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
          Sure veya Dua Ekle
        </h1>
        <span className="w-10" />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-700/60 dark:text-cream-200/60">
        Seçtiklerin Günlük Okumalar'daki "Eklediklerim" sekmesinde görünür.
      </p>

      <div
        role="tablist"
        aria-label="Ekle türü"
        className="mt-4 flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
              tab === t.id
                ? "bg-teal-600 text-cream-50 shadow-sm"
                : "text-teal-700 dark:text-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="mb-6 mt-4 flex flex-col gap-2">
        {tab === "sure"
          ? ENTRIES.map((entry) => (
              <ToggleRow
                key={entry.id}
                label={entry.name}
                subtitle={entry.subtitle}
                added={isAdded("quran", entry.id)}
                onToggle={() => handleToggle("quran", entry.id)}
              />
            ))
          : DUALAR.map((item) => (
              <ToggleRow
                key={item.id}
                label={item.name}
                subtitle={item.occasion}
                added={isAdded("dhikr", item.id)}
                onToggle={() => handleToggle("dhikr", item.id)}
              />
            ))}
      </ul>
    </div>
  );
}
