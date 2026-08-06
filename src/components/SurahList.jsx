import { useState } from "react";
import { getLastReadDate } from "../lib/streak";
import { getFavoriteIds, toggleFavorite } from "../lib/favorites";

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
  const [favIds, setFavIds] = useState(() => new Set(getFavoriteIds()));

  const handleToggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavIds(new Set(toggleFavorite(id)));
  };

  return (
    <ul className="flex flex-col gap-3">
      {surahs.map((surah) => {
        const lastRead = getLastReadDate(surah.id);
        const favorite = favIds.has(surah.id);
        return (
          <li key={surah.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onSelectSurah(surah.id)}
              className="flex flex-1 items-center justify-between rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition hover:border-teal-600/40 dark:border-cream-200/15 dark:bg-white/5"
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

            <button
              type="button"
              onClick={(e) => handleToggleFavorite(e, surah.id)}
              aria-pressed={favorite}
              aria-label={
                favorite
                  ? `${surah.name} favorilerden çıkar`
                  : `${surah.name} favorilere ekle`
              }
              className={`shrink-0 rounded-2xl border px-3 text-lg transition ${
                favorite
                  ? "border-gold-500/40 bg-gold-500/10 text-gold-500"
                  : "border-teal-600/15 text-ink-700/30 hover:text-ink-700/60 dark:border-cream-200/15 dark:text-cream-200/30 dark:hover:text-cream-200/60"
              }`}
            >
              {favorite ? "★" : "☆"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
