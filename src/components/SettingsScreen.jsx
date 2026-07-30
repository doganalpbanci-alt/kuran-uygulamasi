import { useState } from "react";
import { getPrefs, updatePrefs } from "../lib/prefs";
import { RECITERS, getReciter } from "../lib/recitation";
import { TRANSLATIONS, getTranslation } from "../lib/translations";
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

        {[
          { lang: "tr", label: "Türkçe" },
          { lang: "en", label: "English" },
        ].map(({ lang, label }) => (
          <div key={lang} className="mt-3">
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-700/50 dark:text-cream-200/40">
              {label}
            </h3>
            <div className="flex flex-col gap-1">
              {TRANSLATIONS.filter((t) => t.lang === lang).map((t) => {
                const selected = t.id === currentTranslationId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setPrefs(updatePrefs({ translationId: t.id }))
                    }
                    aria-pressed={selected}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-teal-600 text-cream-50"
                        : "text-ink-900 hover:bg-teal-600/10 dark:text-cream-100"
                    }`}
                  >
                    <span>{t.name}</span>
                    {selected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
        <div className="mt-3 flex flex-col gap-1">
          {RECITERS.map((r) => {
            const selected = r.id === currentReciterId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setPrefs(updatePrefs({ reciterId: r.id }));
                }}
                aria-pressed={selected}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected
                    ? "bg-teal-600 text-cream-50"
                    : "text-ink-900 hover:bg-teal-600/10 dark:text-cream-100"
                }`}
              >
                <span>
                  {r.name}
                  {r.style && (
                    <span
                      className={
                        selected
                          ? "text-cream-100/80"
                          : "text-ink-700/50 dark:text-cream-200/50"
                      }
                    >
                      {" "}
                      — {r.style}
                    </span>
                  )}
                </span>
                {selected && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
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
