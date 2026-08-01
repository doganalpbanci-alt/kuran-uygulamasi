import { useEffect, useRef, useState } from "react";
import { ReciterPicker, TranslationPicker } from "./Pickers";

/**
 * Sure ekranından açılan hızlı seçim paneli: kari ve meal buradan
 * değiştirilebiliyor, ana ekrana dönüp Ayarlar'a girmeye gerek kalmıyor.
 *
 * Seçim anında uygulanır; panel açık kalır ki karileri deneyerek
 * karşılaştırmak kolay olsun.
 */
export default function QuickSettings({
  open,
  onClose,
  reciterId,
  translationId,
  onReciterChange,
  onTranslationChange,
}) {
  const [tab, setTab] = useState("reciter");
  const panelRef = useRef(null);

  // Panel açıkken arkadaki sayfa kaymasın.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Kari ve meal seçimi"
        className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-cream-50 pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-[#182620]"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex rounded-full bg-teal-600/10 p-0.5 text-xs dark:bg-white/5">
            {[
              { id: "reciter", label: "Kari" },
              { id: "translation", label: "Meal" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  tab === t.id
                    ? "bg-teal-600 text-cream-50 shadow-sm"
                    : "text-teal-700 dark:text-cream-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-teal-700 dark:text-gold-500"
          >
            Bitti
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {tab === "reciter" ? (
            <ReciterPicker value={reciterId} onChange={onReciterChange} />
          ) : (
            <TranslationPicker
              value={translationId}
              onChange={onTranslationChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
