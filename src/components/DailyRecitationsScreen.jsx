import { useState } from "react";
import {
  DAILY_RECITATIONS,
  DAILY_CATEGORIES,
  TIME_TAGS,
  isItemReady,
  quranEntryFor,
  quranGroupEntries,
  resolveRoutineRefs,
} from "../lib/dailyRecitations";
import { routineItemsForTag, removeFromRoutineTag } from "../lib/routine";

function Meta({ item }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-700/60 dark:text-cream-200/60">
      <span>{item.occasion}</span>
      <span className="font-medium text-teal-700 dark:text-gold-500">
        {item.repeat}
      </span>
    </div>
  );
}

function Source({ item }) {
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-ink-700/45 dark:text-cream-200/40">
      Kaynak: {item.source}
    </p>
  );
}

function QuranItem({ item, onOpenSurah }) {
  if (item.type === "quran-group") {
    const entries = quranGroupEntries(item);
    const ready = isItemReady(item);
    return (
      <li className="rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 shadow-sm dark:border-cream-200/15 dark:bg-white/5">
        <h3 className="text-base font-semibold text-ink-900 dark:text-cream-100">
          {item.name}
        </h3>
        <Meta item={item} />
        {ready ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {entries.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenSurah(e.id)}
                className="rounded-full border border-teal-600/30 px-3 py-1 text-xs text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
              >
                {e.name} →
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-700/50 dark:text-cream-200/45">
            Veri hazırlanıyor, kısa süre sonra tekrar deneyin.
          </p>
        )}
        <Source item={item} />
      </li>
    );
  }

  const entry = quranEntryFor(item);
  const ready = entry != null;
  return (
    <li>
      <button
        type="button"
        disabled={!ready}
        onClick={() => ready && onOpenSurah(entry.id)}
        className="w-full rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition disabled:opacity-60 dark:border-cream-200/15 dark:bg-white/5"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-ink-900 dark:text-cream-100">
            {item.name}
          </h3>
          {ready && (
            <span className="shrink-0 text-teal-700 dark:text-gold-500">→</span>
          )}
        </div>
        <Meta item={item} />
        {!ready && (
          <p className="mt-2 text-xs text-ink-700/50 dark:text-cream-200/45">
            Veri hazırlanıyor, kısa süre sonra tekrar deneyin.
          </p>
        )}
        <Source item={item} />
      </button>
    </li>
  );
}

function DhikrItem({ item, onOpenDhikr }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenDhikr(item)}
        className="w-full rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition hover:border-teal-600/40 dark:border-cream-200/15 dark:bg-white/5"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-ink-900 dark:text-cream-100">
            {item.name}
          </h3>
          <span className="shrink-0 text-teal-700 dark:text-gold-500">→</span>
        </div>
        <Meta item={item} />
        <Source item={item} />
      </button>
    </li>
  );
}

function RoutineItem({ item, onOpen, onRemove }) {
  return (
    <li className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center justify-between rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition hover:border-teal-600/40 dark:border-cream-200/15 dark:bg-white/5"
      >
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-cream-100">
            {item.name}
          </h3>
          <Meta item={item} />
        </div>
        <span className="shrink-0 text-teal-700 dark:text-gold-500">→</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${item.name} rutinden çıkar`}
        className="shrink-0 rounded-2xl border border-teal-600/15 px-3 text-lg text-ink-700/40 transition hover:text-red-500 dark:border-cream-200/15 dark:text-cream-200/40"
      >
        ×
      </button>
    </li>
  );
}

export default function DailyRecitationsScreen({
  onBack,
  onOpenAdd,
  onOpenSurah,
  onOpenDhikr,
}) {
  const [category, setCategory] = useState(DAILY_CATEGORIES[0].id);
  const [timeFilter, setTimeFilter] = useState("all");
  const [routineTag, setRoutineTag] = useState(TIME_TAGS[0].id);
  const [refresh, setRefresh] = useState(0);

  const isRoutineTab = category === "rutinim";
  const routineDisplay = isRoutineTab
    ? resolveRoutineRefs(routineItemsForTag(routineTag))
    : [];

  const inCategory = isRoutineTab
    ? routineDisplay
    : DAILY_RECITATIONS.filter((i) => i.category === category);
  const visible =
    isRoutineTab || timeFilter === "all"
      ? inCategory
      : inCategory.filter((i) => i.tags.includes(timeFilter));

  const handleRemoveFromRoutine = (item) => {
    const type = item.type === "dhikr" ? "dhikr" : "quran";
    const refId = item.type === "dhikr" ? item.id : item.entryId;
    removeFromRoutineTag(routineTag, type, refId);
    setRefresh((n) => n + 1);
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
          Günlük Okumalar
        </h1>
        {isRoutineTab ? (
          <button
            type="button"
            onClick={() => onOpenAdd(routineTag)}
            aria-label="Rutine sure veya dua ekle"
            className="text-sm font-medium text-teal-700 dark:text-gold-500"
          >
            + Ekle
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-700/60 dark:text-cream-200/60">
        Sahih hadislerde belirtilen okunması tavsiye edilen sure ve dualar.
        Her öğenin altında kaynağı belirtilir. "Rutinim" sekmesinde sabah,
        gece ve gün içi için kendi okuma rutinini oluşturabilirsin.
      </p>

      {/* Ana kategori: Günlük Okumalar (Kur'an) / Dualar (hadis) / Rutinim */}
      <div
        role="tablist"
        aria-label="Kategori"
        className="mt-4 flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5"
      >
        {DAILY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
              category === c.id
                ? "bg-teal-600 text-cream-50 shadow-sm"
                : "text-teal-700 dark:text-cream-100"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Günlük Okumalar/Dualar'da salt filtre; Rutinim'de hangi rutin düzenleniyor. */}
      <div
        role="group"
        aria-label={isRoutineTab ? "Düzenlenen rutin" : "Vakit filtresi"}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {!isRoutineTab && (
          <button
            type="button"
            onClick={() => setTimeFilter("all")}
            aria-pressed={timeFilter === "all"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              timeFilter === "all"
                ? "bg-teal-600 text-cream-50"
                : "border border-teal-600/25 text-teal-700 dark:border-cream-200/25 dark:text-cream-100"
            }`}
          >
            Tümü
          </button>
        )}
        {TIME_TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              isRoutineTab ? setRoutineTag(t.id) : setTimeFilter(t.id)
            }
            aria-pressed={isRoutineTab ? routineTag === t.id : timeFilter === t.id}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              (isRoutineTab ? routineTag === t.id : timeFilter === t.id)
                ? "bg-gold-500/20 text-gold-500 ring-1 ring-gold-500/40"
                : "border border-teal-600/25 text-teal-700 dark:border-cream-200/25 dark:text-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 px-2 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
          {isRoutineTab
            ? 'Bu vakit için henüz bir şey eklemedin. Sağ üstteki "+ Ekle" ile sure ya da dua ekleyebilirsin.'
            : "Bu vakitte bu kategoride öğe yok."}
        </p>
      ) : (
        <ul key={refresh} className="mb-6 mt-4 flex flex-col gap-3">
          {visible.map((item) => {
            if (isRoutineTab) {
              return (
                <RoutineItem
                  key={item.id}
                  item={item}
                  onOpen={() =>
                    item.type === "dhikr"
                      ? onOpenDhikr(item)
                      : onOpenSurah(item.entryId)
                  }
                  onRemove={() => handleRemoveFromRoutine(item)}
                />
              );
            }
            return item.type === "dhikr" ? (
              <DhikrItem key={item.id} item={item} onOpenDhikr={onOpenDhikr} />
            ) : (
              <QuranItem key={item.id} item={item} onOpenSurah={onOpenSurah} />
            );
          })}
        </ul>
      )}
    </div>
  );
}
