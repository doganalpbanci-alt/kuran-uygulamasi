import { getLastReadDate } from "../lib/streak";

function formatLastRead(dateStr) {
  if (!dateStr) return "Henüz okunmadı";
  const today = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.round(
    (today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Bugün okundu";
  if (diffDays === 1) return "Dün okundu";
  return `${diffDays} gün önce okundu`;
}

export default function SurahList({
  surahs,
  showRevelationOrder = false,
  onSelectSurah,
}) {
  return (
    <ul className="flex flex-col gap-3">
      {surahs.map((surah) => {
        const lastRead = getLastReadDate(surah.id);
        return (
          <li key={surah.id}>
            <button
              type="button"
              onClick={() => onSelectSurah(surah.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition hover:border-teal-600/40 dark:border-cream-200/15 dark:bg-white/5"
            >
              <div className="flex items-baseline gap-2">
                {showRevelationOrder && surah.revelation_order && (
                  <span className="shrink-0 rounded-full bg-teal-600/10 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-white/10 dark:text-gold-500">
                    {surah.revelation_order}
                  </span>
                )}
                <div>
                <h2 className="text-lg font-semibold text-ink-900 dark:text-cream-100">
                  {surah.name}
                </h2>
                <p className="text-sm text-ink-700/70 dark:text-cream-200/70">
                  {surah.subtitle} · {surah.verse_count} ayet
                </p>
                </div>
              </div>
              <span className="text-xs text-teal-700 dark:text-gold-500">
                {formatLastRead(lastRead)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
