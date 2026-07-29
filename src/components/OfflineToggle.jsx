import { useEffect, useRef, useState } from "react";
import {
  cacheApiSupported,
  deleteAudio,
  downloadAudio,
  isAudioCached,
} from "../lib/offline";

/**
 * Bir veya birden çok ses dosyasını offline kullanım için indirir.
 * Tilavet ayet başına ayrı mp3 olduğu için urls yüzlerce öğe olabilir;
 * ilerleme dosya sayısına göre hesaplanır.
 */
export default function OfflineToggle({ urls, label = "Offline'a indir" }) {
  const [status, setStatus] = useState("checking");
  const [done, setDone] = useState(0);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // urls her render'da yeni dizi olarak gelebilir. Referansa bağlanırsak
  // ses çalarken üst bileşenin her render'ında tüm dosyalar için cache
  // yeniden taranır; içeriğe bağlı sabit bir anahtar kullanıyoruz.
  const urlsKey = urls.join("|");

  useEffect(() => {
    let cancelled = false;
    const list = urlsKey ? urlsKey.split("|") : [];

    if (!cacheApiSupported || list.length === 0) {
      setStatus("unsupported");
      return;
    }

    setStatus("checking");
    Promise.all(list.map(isAudioCached)).then((results) => {
      if (cancelled) return;
      const cachedCount = results.filter(Boolean).length;
      setDone(cachedCount);
      setStatus(cachedCount === list.length ? "cached" : "absent");
    });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [urlsKey]);

  const handleDownload = async () => {
    setError(null);
    setDone(0);
    setStatus("downloading");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let completed = 0;
      for (const url of urls) {
        if (controller.signal.aborted) break;
        if (!(await isAudioCached(url))) {
          await downloadAudio(url, { signal: controller.signal });
        }
        completed += 1;
        setDone(completed);
      }
      if (controller.signal.aborted) {
        setStatus("absent");
        return;
      }
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
    await Promise.all(urls.map(deleteAudio));
    setDone(0);
    setStatus("absent");
  };

  if (status === "unsupported") return null;

  const percent = urls.length ? Math.round((done / urls.length) * 100) : 0;

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
          ↓ {label}
        </button>
      )}

      {status === "downloading" && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-white/10">
            <div
              className="h-full bg-teal-600 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="tabular-nums text-ink-700/60 dark:text-cream-200/60">
            {urls.length > 1 ? `${done}/${urls.length}` : `${percent}%`}
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
