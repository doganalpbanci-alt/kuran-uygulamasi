import { RECITERS, SYNC_LABELS, reciterSync } from "../lib/recitation";
import { TRANSLATIONS } from "../lib/translations";

/**
 * Kari ve meal listeleri. Hem Ayarlar ekranında hem de sure ekranındaki
 * hızlı seçim panelinde kullanılıyor, ikisi ayrışmasın diye tek yerde.
 */

function Option({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
        selected
          ? "bg-teal-600 text-cream-50"
          : "text-ink-900 hover:bg-teal-600/10 dark:text-cream-100"
      }`}
    >
      <span>{children}</span>
      {selected && <span aria-hidden="true">✓</span>}
    </button>
  );
}

function Group({ title, children }) {
  return (
    <div className="mt-3">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-700/50 dark:text-cream-200/40">
        {title}
      </h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

/** Takip seviyesine göre gruplu kari listesi. */
export function ReciterPicker({ value, onChange }) {
  return (
    <>
      {["word", "verse", "none"].map((sync) => {
        const group = RECITERS.filter((r) => reciterSync(r) === sync);
        if (group.length === 0) return null;
        return (
          <Group key={sync} title={SYNC_LABELS[sync]}>
            {group.map((r) => (
              <Option
                key={r.id}
                selected={r.id === value}
                onClick={() => onChange(r.id)}
              >
                {r.name}
                {r.style && (
                  <span
                    className={
                      r.id === value
                        ? "text-cream-100/80"
                        : "text-ink-700/50 dark:text-cream-200/50"
                    }
                  >
                    {" "}
                    — {r.style}
                  </span>
                )}
              </Option>
            ))}
          </Group>
        );
      })}
    </>
  );
}

/** Dile göre gruplu meal listesi. */
export function TranslationPicker({ value, onChange }) {
  return (
    <>
      {[
        { lang: "tr", label: "Türkçe" },
        { lang: "en", label: "English" },
      ].map(({ lang, label }) => (
        <Group key={lang} title={label}>
          {TRANSLATIONS.filter((t) => t.lang === lang).map((t) => (
            <Option
              key={t.id}
              selected={t.id === value}
              onClick={() => onChange(t.id)}
            >
              {t.name}
            </Option>
          ))}
        </Group>
      ))}
    </>
  );
}
