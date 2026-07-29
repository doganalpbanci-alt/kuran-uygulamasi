import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages projeyi alt dizinde yayınlar
// (https://<kullanıcı>.github.io/kuran-uygulamasi/). Deploy workflow'u
// BASE_PATH'i verir; yerel geliştirmede kök dizin kullanılır.
const base = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        scope: base,
        name: "Günlük Kur'an",
        short_name: "Kur'an",
        description: "Günlük Kur'an okuma alışkanlığı için offline okuma ve dinleme uygulaması.",
        theme_color: '#0f4c3a',
        background_color: '#faf7ef',
        display: 'standalone',
        lang: 'tr',
        start_url: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            // Sure sesleri 13-59 MB arası; otomatik precache edilmez. Kullanıcı
            // "Offline'a indir" dediğinde src/lib/offline.js bu cache'e tam
            // dosyayı yazar. <audio> her zaman Range isteği attığı için
            // rangeRequests, cache'teki tam yanıttan dilim servis edilmesini
            // sağlar (bu olmadan offline oynatma çalışmaz).
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'surah-audio',
              rangeRequests: true,
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
})
