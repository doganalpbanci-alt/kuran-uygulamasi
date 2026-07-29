import { useEffect, useRef, useState } from "react";
import {
  cacheApiSupported,
  deleteAudio,
  downloadAudio,
  isAudioCached,
} from "../lib/offline";

export default function OfflineToggle({ url }) {
  const [status, setStatus] = useState("checking"); // checking|absent|downloading|cached|error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!cacheApiSupported) {
      setStatus("unsupported");
      return;
    }

    setStatus("checking");
    isAudioCached(url).then((cached) => {
      if (!cancelled) setStatus(cached ? "cached" : "absent");
    });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [url]);

  const handleDownload = async () => {
    setError(null);
    setProgress(0);
    setStatus("downloading");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await downloadAudio(url, {
        signal: controller.signal,
        onProgress: (p) => setProgress(p ?? 0),
      });
      setStatus("cached");
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus("absent");
        return;
      }
      setError(err.message);
      setStatus("error");
    }
  };

  const handleDelete = async () => {
    await deleteAudio(url);
    setStatus("absent");
  };

  if (status === "unsupported") return null;

  return (
    <div className="px-5 pt-3 text-xs">
      {status === "checking" && (
        <span className="text-ink-700/50 dark:text-cream-200/50">…</span>
      )}

      {status === "absent" && (
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-full border border-teal-600/30 px-3 py-1.5 text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          ↓ Offline'a indir
        </button>
      )}

      {status === "downloading" && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-white/10">
            <div
              className="h-full bg-teal-600 transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-ink-700/60 dark:text-cream-200/60">
            {Math.round(progress * 100)}%
          </span>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="text-ink-700/60 underline dark:text-cream-200/60"
          >
            İptal
          </button>
        </div>
      )}

      {status === "cached" && (
        <div className="flex items-center gap-2 text-teal-700 dark:text-gold-500">
          <span>✓ Offline kullanıma hazır</span>
          <button
            type="button"
            onClick={handleDelete}
            className="text-ink-700/50 underline dark:text-cream-200/50"
          >
            Kaldır
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2">
          <span className="text-red-600 dark:text-red-400">{error}</span>
          <button
            type="button"
            onClick={handleDownload}
            className="text-teal-700 underline dark:text-gold-500"
          >
            Tekrar dene
          </button>
        </div>
      )}
    </div>
  );
}
