import { useState } from "react";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { getReciter } from "../lib/recitation";
import { getTranslation } from "../lib/translations";
import { ReciterPicker, TranslationPicker } from "./Pickers";
import { FONT_SCALES, READING_FONTS, applyAppearance } from "../lib/appearance";
import {
  notificationsSupported,
  requestNotificationPermission,
} from "../lib/notifications";

export default function SettingsScreen({ onBack, onOpenSyncPicker }) {
  const [prefs, setPrefs] = useState(getPrefs);
  const currentReciterId = getReciter(prefs.reciterId).id;
  const currentTranslationId = getTranslation(prefs.translationId).id;
  const [permission, setPermission] = useState(
    notificationsSupported ? Notification.permission : "unsupported",
  );

  const handleToggleReminder = async (checked) => {
    if (checked && permission !== "granted") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    setPrefs(updatePrefs({ reminderEnabled: checked }));
  };

  const handleTimeChange = (time) => {
    setPrefs(updatePrefs({ reminderTime: time }));
  };

  const handleFontSize = (id) => {
    const next = updatePrefs({ fontSize: id });
    setPrefs(next);
    applyAppearance(next);
  };

  const handleReadingFont = (id) => {
    const next = updatePrefs({ readingFont: id });
    setPrefs(next);
    applyAppearance(next);
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
          Ayarlar
        </h1>
        <span className="w-10" />
      </div>

      <section className="mt-6 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Günlük hatırlatma
        </h2>

        {!notificationsSupported && (
          <p className="mt-2 text-xs text-ink-700/60 dark:text-cream-200/60">
            Bu tarayıcı bildirimleri desteklemiyor.
          </p>
        )}

        {notificationsSupported && (
          <>
            <label className="mt-3 flex items-center justify-between text-sm text-ink-900 dark:text-cream-100">
              Hatırlatmayı etkinleştir
              <input
                type="checkbox"
                checked={prefs.reminderEnabled}
                onChange={(e) => handleToggleReminder(e.target.checked)}
                className="h-5 w-5 accent-teal-600"
              />
            </label>

            <label className="mt-3 flex items-center justify-between text-sm text-ink-900 dark:text-cream-100">
              Saat
              <input
                type="time"
                value={prefs.reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="rounded border border-teal-600/30 bg-transparent px-2 py-1 dark:border-cream-200/30"
              />
            </label>

            {permission === "denied" && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Bildirim izni reddedildi. Tarayıcı ayarlarından izin
                verebilirsin.
              </p>
            )}
            <p className="mt-2 text-xs text-ink-700/60 dark:text-cream-200/60">
              Not: bildirim yalnızca uygulama açıkken kontrol edilir.
            </p>
          </>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Meal
        </h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Seçilen meal bütün sekmelerde kullanılır.
        </p>

        <TranslationPicker
          value={currentTranslationId}
          onChange={(id) => setPrefs(updatePrefs({ translationId: id }))}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Erişilebilirlik
        </h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Arapça metin, meal, okunuş ve tefsir yazı boyutunu değiştirir.
          Menüler ve düğmeler etkilenmez.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(FONT_SCALES).map(([id, s]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleFontSize(id)}
              aria-pressed={prefs.fontSize === id}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                prefs.fontSize === id
                  ? "bg-teal-600 text-cream-50"
                  : "bg-teal-600/10 text-teal-700 dark:bg-white/5 dark:text-cream-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          {Object.entries(READING_FONTS).map(([id, f]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleReadingFont(id)}
              aria-pressed={prefs.readingFont === id}
              style={{ fontFamily: f.stack }}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                prefs.readingFont === id
                  ? "bg-teal-600 text-cream-50"
                  : "text-ink-900 hover:bg-teal-600/10 dark:text-cream-100"
              }`}
            >
              <span>{f.label}</span>
              {prefs.readingFont === id && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-teal-600/5 px-4 py-3 dark:bg-white/5">
          <p className="font-[var(--font-reading)] text-[calc(1rem*var(--font-scale,1))] leading-relaxed text-ink-900 dark:text-cream-100">
            Elif, Lâm, Mîm. İşte bu kitap; kendisinde hiçbir şüphe yoktur.
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Tilavet oynatma
        </h2>
        <div className="mt-3 flex flex-col gap-1">
          {[
            {
              id: "verse",
              label: "Ayet ayet",
              desc: "Her ayet ayrı kayıt. Ayet tekrarı ve tek ayet dinlemek kolay.",
            },
            {
              id: "continuous",
              label: "Baştan sona kesintisiz",
              desc: "Sure tek kayıt olarak akar, ayet geçişlerinde hiç boşluk olmaz. İmleç ve vurgu yine takip eder.",
            },
          ].map((opt) => {
            const selected = prefs.recitationMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setPrefs(updatePrefs({ recitationMode: opt.id }))
                }
                aria-pressed={selected}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  selected
                    ? "bg-teal-600 text-cream-50"
                    : "text-ink-900 hover:bg-teal-600/10 dark:text-cream-100"
                }`}
              >
                <span className="flex items-center justify-between text-sm">
                  {opt.label}
                  {selected && <span aria-hidden="true">✓</span>}
                </span>
                <span
                  className={`mt-0.5 block text-xs ${
                    selected
                      ? "text-cream-100/80"
                      : "text-ink-700/60 dark:text-cream-200/50"
                  }`}
                >
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-700/60 dark:text-cream-200/60">
          Âmenerrasûlü gibi sure ortasından alınan bölümlerde kesintisiz kayıt
          yok; orada ayet ayet çalınır.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Kari (Arapça tilavet)
        </h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Seçilen kari tüm surelerde kullanılır. Her kariye ait ses ayrı
          indirilir; kari değiştirirseniz offline için yeniden indirmeniz
          gerekir.
        </p>
        <ReciterPicker
          value={currentReciterId}
          onChange={(id) => setPrefs(updatePrefs({ reciterId: id }))}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Okuma
        </h2>
        <label className="mt-3 flex items-center justify-between text-sm text-ink-900 dark:text-cream-100">
          Kelime imleci
          <input
            type="checkbox"
            checked={prefs.wordCursor}
            onChange={(e) => setPrefs(updatePrefs({ wordCursor: e.target.checked }))}
            className="h-5 w-5 accent-teal-600"
          />
        </label>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Tilavet dinlerken o an okunan kelimeyi vurgular. Zaman damgaları
          gerçek olduğu için konum kesindir; sade bir metin tercih ediyorsanız
          kapatabilirsiniz.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-teal-600/15 p-4 dark:border-cream-200/15">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          Senkron modu
        </h2>
        <p className="mt-1 text-xs text-ink-700/60 dark:text-cream-200/60">
          Ayet zaman damgalarını sesle eşleştirmek için sure seç.
        </p>
        <button
          type="button"
          onClick={onOpenSyncPicker}
          className="mt-3 rounded-full border border-teal-600/30 px-4 py-1.5 text-sm text-teal-700 dark:border-cream-200/30 dark:text-cream-100"
        >
          Senkron moduna git
        </button>
      </section>
    </div>
  );
}
