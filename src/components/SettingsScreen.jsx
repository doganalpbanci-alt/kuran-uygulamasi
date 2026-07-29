import { useState } from "react";
import { getPrefs, updatePrefs } from "../lib/prefs";
import {
  notificationsSupported,
  requestNotificationPermission,
} from "../lib/notifications";

export default function SettingsScreen({ onBack, onOpenSyncPicker }) {
  const [prefs, setPrefs] = useState(getPrefs);
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
