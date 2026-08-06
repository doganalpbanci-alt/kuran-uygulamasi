import {
  DAILY_RECITATIONS,
  isItemReady,
  quranEntryFor,
  quranGroupEntries,
} from "../lib/dailyRecitations";

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

export default function DailyRecitationsScreen({
  onBack,
  onOpenSurah,
  onOpenDhikr,
}) {
  const quranItems = DAILY_RECITATIONS.filter((i) => i.type !== "dhikr");
  const dhikrItems = DAILY_RECITATIONS.filter((i) => i.type === "dhikr");

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
        <span className="w-10" />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-700/60 dark:text-cream-200/60">
        Sahih hadislerde belirtilen sabah-akşam ve namaz sonrası okunması
        tavsiye edilen sure ve dualar. Her öğenin altında kaynağı belirtilir.
      </p>

      {quranItems.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-700/50 dark:text-cream-200/40">
            Kur'an Okumaları
          </h2>
          <ul className="flex flex-col gap-3">
            {quranItems.map((item) => (
              <QuranItem key={item.id} item={item} onOpenSurah={onOpenSurah} />
            ))}
          </ul>
        </section>
      )}

      {dhikrItems.length > 0 && (
        <section className="mb-6 mt-5">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-700/50 dark:text-cream-200/40">
            Zikir ve Dualar
          </h2>
          <ul className="flex flex-col gap-3">
            {dhikrItems.map((item) => (
              <DhikrItem key={item.id} item={item} onOpenDhikr={onOpenDhikr} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
