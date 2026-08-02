import { useEffect, useState } from "react";
import { loadTafsir, loadVerses } from "../lib/dataStore";

/**
 * Bölümün ayetlerini yükler. Veri uygulamayla paketlenmediği için ilk
 * açılışta internet gerekiyor; sonrasında service worker cache'inden
 * geldiği için offline çalışıyor.
 */
export function useVerses(entryId) {
  const [state, setState] = useState({ verses: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ verses: null, error: null });

    loadVerses(entryId)
      .then((verses) => !cancelled && setState({ verses, error: null }))
      .catch((error) => !cancelled && setState({ verses: null, error }));

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  return state;
}

/** Seçili tefsirin blokları. Tefsir yoksa boş dizi döner. */
export function useTafsir(tafsirId, entryId) {
  const [state, setState] = useState({ blocks: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ blocks: null, error: null });

    if (!tafsirId) {
      setState({ blocks: [], error: null });
      return;
    }

    loadTafsir(tafsirId, entryId)
      .then((blocks) => !cancelled && setState({ blocks, error: null }))
      .catch((error) => !cancelled && setState({ blocks: null, error }));

    return () => {
      cancelled = true;
    };
  }, [tafsirId, entryId]);

  return state;
}
