# Günlük Kur'an

Kıraat dinlerken Türkçe okunuşu ve meali eş zamanlı takip edebileceğin, offline
çalışan bir PWA. Günlük okuma alışkanlığı için basit bir streak takibi içerir.

MVP kapsamı: Yasin, Mülk, Vakıa, Kehf sureleri (Diyanet İşleri meali,
[Açık Kuran API](https://acikkuran.com/api) üzerinden build-time çekilir).

## Geliştirme

```bash
npm install
npm run dev
```

## Sure verisini yeniden çekmek

`src/data/surahs.json` build-time üretilir, uygulama çalışırken API'ye gitmez.
Veriyi yeniden çekmek için:

```bash
node scripts/fetch-surahs.mjs
```

## Ayet-ses senkronu

Sure sesleri tek parça mp3 olduğundan ayet başlangıç zamanları otomatik
değildir. Uygulama içinde **Ayarlar → Senkron moduna git** ile her sure için
sesi dinleyip ayete geldiğinde "Bu ayet burada başlıyor" tuşuna basarak zaman
damgası girilebilir. Bu değerler tarayıcının localStorage'ında saklanır ve
"Dışa aktar (JSON)" ile yedeklenebilir. Zaman damgası girilmemiş ayetler için
uygulama sure süresine oranlayarak kaba bir tahmin kullanır.

## Offline kullanım

Uygulama kabuğu (arayüz, ayet metinleri, mealler) service worker ile
precache edilir; ilk açılıştan sonra internet olmadan da çalışır.

Ses dosyaları büyük olduğu için (Mülk 13 MB, Yasin 28 MB, Vakıa 15 MB,
Kehf 59 MB) otomatik indirilmez. Okuma ekranındaki **"Offline'a indir"**
ile sure sure indirilir; indirilen sesler "Kaldır" ile silinebilir.

Bu adım şart: `<audio>` elementi ses dosyalarını her zaman Range
(206 Partial Content) isteğiyle çeker ve kısmi yanıtlar cache'lenmez —
yani sadece dinlemek dosyayı offline'a almaz. İndirme, tam dosyayı
service worker'ın okuduğu cache'e yazar; workbox'ın `rangeRequests`
eklentisi de bu tam yanıttan Range dilimlerini servis eder.

## Build

```bash
npm run build
```

## Teknoloji

- React + Vite
- Tailwind CSS v4
- vite-plugin-pwa (offline service worker, manifest)
- State: React hooks + localStorage (ek state kütüphanesi yok)
