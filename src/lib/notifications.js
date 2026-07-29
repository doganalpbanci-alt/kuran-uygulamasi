import { getPrefs, updatePrefs } from "./prefs";
import { hasReadToday } from "./streak";
import { localDateString } from "./storage";

export const notificationsSupported =
  typeof window !== "undefined" && "Notification" in window;

export async function requestNotificationPermission() {
  if (!notificationsSupported) return "unsupported";
  return Notification.requestPermission();
}

/**
 * Uygulama açıkken çağrılır: hatırlatma saati geçtiyse ve bugün henüz
 * okunmadıysa (ve bugün için daha önce bildirim gönderilmediyse) tarayıcı
 * bildirimi gösterir. Gerçek arka plan zamanlama için push sunucusu
 * gerekir; bu, PWA açıkken çalışan basit bir istemci taraflı kontroldür.
 */
export function checkAndNotify() {
  if (!notificationsSupported || Notification.permission !== "granted") return;

  const prefs = getPrefs();
  if (!prefs.reminderEnabled) return;
  if (hasReadToday()) return;

  const today = localDateString();
  if (prefs.lastNotifiedDate === today) return;

  const [hh, mm] = prefs.reminderTime.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hh, mm, 0, 0);

  if (now < target) return;

  new Notification("Günlük Kur'an okuma zamanı", {
    body: "Bugün henüz okumadın. Birkaç dakikanı ayırmaya ne dersin?",
    icon: "/pwa-192x192.png",
  });

  updatePrefs({ lastNotifiedDate: today });
}
