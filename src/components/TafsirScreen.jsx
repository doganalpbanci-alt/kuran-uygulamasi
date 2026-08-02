import { useEffect, useRef } from "react";
import { useTafsir } from "../hooks/useEntryData";
import { TAFSIRS } from "../lib/dataStore";

/**
 * Tefsir ekranı.
 *
 * Tefsirler ayet ayet değil ayet gruplarına göre yazılıyor (İbn Kesir'de
 * Alak 1-5 tek blok), o yüzden blok blok gösteriliyor. Mealde takılınan
 * ayetten gelindiyse o blok işaretlenip oraya kaydırılıyor.
 *
 * Metin kaynakta HTML olarak geliyor; başlık ve paragraf etiketlerini
 * koruyup okunur biçimde basıyoruz.
 */
export default function TafsirScreen({ surah, tafsirId, focusVerse, onBack }) {
  const { blocks, error } = useTafsir(tafsirId, surah.id);
  const tafsir = TAFSIRS.find((t) => t.id === tafsirId);
  const focusRef = useRef(null);

  useEffect(() => {
    if (blocks && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, [blocks]);

  return (
    <div className="flex min-h-full flex-col pb-10">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-teal-700/10 bg-cream-50/95 px-4 py-3 backdrop-blur dark:border-cream-200/10 dark:bg-[#14211c]/95">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-teal-700 dark:text-gold-500"
        >
          ← Geri
        </button>
        <h1 className="truncate px-2 text-base font-semibold text-ink-900 dark:text-cream-100">
          Tefsir — {surah.name}
        </h1>
        <span className="w-10" />
      </div>

      <p className="px-5 pt-2 text-center text-xs text-ink-700/60 dark:text-cream-200/60">
        {tafsir?.name}
        {tafsir?.lang === "en" && " · İngilizce"}
      </p>

      {!blocks && !error && (
        <p className="px-5 py-10 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
          Tefsir yükleniyor…
        </p>
      )}

      {error && (
        <p className="px-5 py-10 text-center text-sm text-red-600 dark:text-red-400">
          Tefsir yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.
        </p>
      )}

      {blocks?.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-ink-700/60 dark:text-cream-200/60">
          Bu bölüm için tefsir bulunamadı.
        </p>
      )}

      <div className="px-5 py-4">
        {blocks?.map((block) => {
          const isFocus =
            focusVerse != null &&
            focusVerse >= block.from &&
            focusVerse <= block.to;
          return (
            <section
              key={`${block.from}-${block.to}`}
              ref={isFocus ? focusRef : null}
              className={`mb-6 scroll-mt-16 rounded-xl px-3 py-3 ${
                isFocus ? "bg-gold-500/15 ring-1 ring-gold-500/40" : ""
              }`}
            >
              <span className="text-xs font-medium text-teal-700/70 dark:text-gold-500/70">
                {block.from === block.to
                  ? `${block.from}. ayet`
                  : `${block.from}-${block.to}. ayetler`}
              </span>
              <div
                className="tafsir mt-2 text-[15px] leading-relaxed text-ink-900 dark:text-cream-100"
                dangerouslySetInnerHTML={{ __html: block.text }}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
