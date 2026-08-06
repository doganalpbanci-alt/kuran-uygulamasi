import { useState } from "react";
import { getBookmarks, removeBookmark } from "../lib/bookmarks";

export default function BookmarksScreen({ onBack, onOpenBookmark }) {
  const [bookmarks, setBookmarks] = useState(() =>
    [...getBookmarks()].sort((a, b) => b.createdAt - a.createdAt),
  );

  const handleRemove = (e, b) => {
    e.stopPropagation();
    removeBookmark(b.surahId, b.verseNumber);
    setBookmarks((prev) => prev.filter((x) => x.key !== b.key));
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
          Yer İşaretlerim
        </h1>
        <span className="w-10" />
      </div>

      {bookmarks.length === 0 ? (
        <p className="mt-10 px-2 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
          Henüz yer imi yok. Okurken bir ayetin yanındaki 🔖 ile
          ekleyebilirsin.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {bookmarks.map((b) => (
            <li key={b.key} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => onOpenBookmark(b.surahId, b.verseNumber)}
                className="flex min-w-0 flex-1 flex-col items-start rounded-2xl border border-teal-600/15 bg-white/60 px-5 py-4 text-left shadow-sm transition hover:border-teal-600/40 dark:border-cream-200/15 dark:bg-white/5"
              >
                <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
                  {b.surahName} · {b.verseNumber}. ayet
                </h2>
                {b.preview && (
                  <p className="mt-1 line-clamp-2 text-xs text-ink-700/60 dark:text-cream-200/60">
                    {b.preview}
                  </p>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleRemove(e, b)}
                aria-label="Yer imini sil"
                className="shrink-0 rounded-2xl border border-teal-600/15 px-3 text-sm text-ink-700/40 transition hover:border-red-400/40 hover:text-red-500 dark:border-cream-200/15 dark:text-cream-200/40"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
