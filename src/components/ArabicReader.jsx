import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePlaylistPlayer } from "../hooks/usePlaylistPlayer";
import { markSurahCompleted } from "../lib/streak";
import { clearProgress, getProgress, saveProgress } from "../lib/progress";
import {
  getTimedWords,
  reciterLabel,
  reciterSync,
  verseAudioUrl,
} from "../lib/recitation";
import { getPrefs } from "../lib/prefs";
import PlaylistPlayer from "./PlaylistPlayer";
import VerseList from "./VerseList";
import OfflineToggle from "./OfflineToggle";

/** Arapça tilavet: ayet başına ayrı mp3, kesin ayet ve kelime senkronu. */
export default function ArabicReader({
  surah,
  verses,
  reciter,
  layout,
  translationId,
  focusVerse = null,
}) {
  const verseRefs = useRef([]);

  const items = useMemo(
    () =>
      verses.map((v) => ({
        // Kısmi bölümlerde id metinsel olduğu için kaynak sure numarası
        // kullanılıyor (örn. Âmenerrasûlü -> Bakara).
        url: verseAudioUrl(reciter, surah.audio_surah, v.verse_number),
      })),
    [verses, reciter, surah.audio_surah],
  );

  const arabicWordsFor = useCallback(
    (verse) => getTimedWords(verse, reciter.id),
    [reciter.id],
  );

  // Kelime imleci yalnızca kelime zaman damgası olan karilerde.
  const wordCursor = getPrefs().wordCursor && reciterSync(reciter) === "word";

  const handleFinished = useCallback(() => {
    markSurahCompleted(surah.id);
    clearProgress(surah.id);
  }, [surah.id]);

  const player = usePlaylistPlayer({ items, onFinished: handleFinished });
  const { index, isPlaying, currentTime } = player;

  // Kaldığı ayetten devam
  const restoredRef = useRef(false);
  useEffect(() => {
    restoredRef.current = false;
  }, [surah.id]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = getProgress(surah.id);
    if (saved?.verseIndex > 0 && saved.verseIndex < items.length) {
      player.goTo(saved.verseIndex);
    }
    // Yalnızca sure değiştiğinde bir kez çalışmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah.id, items.length]);

  useEffect(() => {
    if (!restoredRef.current) return;
    saveProgress(surah.id, {
      verseIndex: index,
      verseNumber: verses[index]?.verse_number ?? 0,
    });
  }, [index, surah.id, verses]);

  // Otomatik scroll yalnızca çalarken
  useEffect(() => {
    if (!isPlaying) return;
    verseRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [index, isPlaying]);

  return (
    <>
      {/* Ses elemanları hook içinde tutuluyor (çift tampon), DOM'da yok. */}
      <OfflineToggle
        urls={items.map((i) => i.url)}
        label={`Tilaveti offline'a indir (${reciterLabel(reciter)})`}
      />

      <VerseList
        surah={surah}
        verses={verses}
        layout={layout}
        translationId={translationId}
        activeIndex={index}
        arabicWordsFor={arabicWordsFor}
        arabicTimeMs={wordCursor ? currentTime * 1000 : null}
        isPlaying={isPlaying}
        onSelectVerse={(i) => player.goTo(i, { autoplay: true })}
        verseRefs={verseRefs}
        focusVerse={focusVerse}
      />

      {/* Oynatıcı en sonda: ekranın altına sabitleniyor. */}
      <PlaylistPlayer
        {...player}
        total={items.length}
        verseNumber={verses[index]?.verse_number}
      />
    </>
  );
}
