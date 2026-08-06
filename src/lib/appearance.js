import { getPrefs } from "./prefs";

/**
 * Yalnızca okuma alanındaki metni (Arapça, meal, okunuş, tefsir) ölçekler —
 * üst bar, düğmeler ve boşluklar Tailwind'in sabit sınıflarını kullanmaya
 * devam ettiği için düzen bozulmaz. Bileşenler boyutu doğrudan yazmak
 * yerine `calc(...*var(--font-scale,1))` ile bu değişkeni okuyor.
 */
export const FONT_SCALES = {
  sm: { value: 0.875, label: "Küçük" },
  base: { value: 1, label: "Normal" },
  lg: { value: 1.125, label: "Büyük" },
  xl: { value: 1.25, label: "Daha Büyük" },
  xxl: { value: 1.5, label: "En Büyük" },
};

// Harici font indirilmiyor: uygulama offline'da build zamanındaki gibi
// görünsün diye yalnızca sistemde hazır bulunan yığınlar arasından seçiliyor.
export const READING_FONTS = {
  serif: {
    label: "Serif (klasik)",
    stack: 'Georgia, "Times New Roman", serif',
  },
  sans: {
    label: "Sans (yalın)",
    stack: '"Segoe UI", system-ui, Roboto, sans-serif',
  },
};

/** Font boyutu ve okuma fontunu CSS değişkeni olarak uygular. */
export function applyAppearance(prefs = getPrefs()) {
  const root = document.documentElement;
  const scale = FONT_SCALES[prefs.fontSize]?.value ?? 1;
  const font =
    READING_FONTS[prefs.readingFont]?.stack ?? READING_FONTS.serif.stack;
  root.style.setProperty("--font-scale", String(scale));
  root.style.setProperty("--font-reading", font);
}
