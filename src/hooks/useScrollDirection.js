import { useEffect, useState } from "react";

/**
 * Sayfa aşağı kaydırılırken false, yukarı kaydırılırken true döner.
 * Başlık çubuğunu okurken gizleyip geri dönmek istendiğinde göstermek için.
 *
 * Küçük hareketler çubuğu titretmesin diye eşik var; en üstteyken her
 * zaman görünür kabul ediliyor.
 */
export function useScrollDirection({ threshold = 24, topOffset = 80 } = {}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (y <= topOffset) {
        setVisible(true);
        lastY = y;
      } else if (Math.abs(delta) > threshold) {
        setVisible(delta < 0);
        lastY = y;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return visible;
}
