# Günlük Kur'an

Kıraat dinlerken Türkçe okunuşu ve meali eş zamanlı takip edebileceğin, offline
çalışan bir PWA. Günlük okuma alışkanlığı için basit bir streak takibi içerir.

MVP kapsamı: Yasin, Mülk, Vakıa, Kehf sureleri.

Sure ekranı ikiye ayrılır:

- **Okuma** — ses yok. Her ayet önce Türkçe meal, altında Arapça metin, en
  altta Latin okunuşu.
- **Dinleme** — aşağıdaki iki kaynaktan biri seçilir.

Dinleme kaynakları:

- **Arapça tilavet** — 12 kari arasından seçilebilir (varsayılan Mishari
  Rashid al-Afasy), ayet başına ayrı kayıt
  ([Quran.com API](https://api-docs.quran.foundation/)). Ayet senkronu
  kendiliğinden kesin; kelime zaman damgaları da geldiği için imleç
  okunan kelimeyi birebir takip eder. Kari, Ayarlar'dan değiştirilir ve
  zaman damgaları kari başına ayrı tutulduğu için imleç her karide
  doğrudur.
- **Türkçe meal sesi** — sure başına tek mp3
  ([Açık Kuran API](https://acikkuran.com/api)).

  > **Dikkat:** Bu kayıt, ekranda yazan Diyanet meali değildir. Açık Kuran
  > sure başına tek bir Türkçe ses sunuyor ve `author` parametresi ne
  > olursa olsun aynı dosyayı döndürüyor — yani ses başka bir çeviriden
  > okunuyor. Bu yüzden bu kaynakta kelime imleci kapalıdır ve ayet
  > vurgusu yalnızca sesin sure içindeki konumundan tahmin edilir.

Okunuş ve meal metinleri Açık Kuran'dan, Arapça kelime metinleri
Quran.com'dan gelir; hepsi build-time çekilip `src/data/surahs.json`
içine yazılır.

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

## Kelime imleci

Ses çalarken o an okunan kelime vurgulanır; öncesi koyu, sonrası soluk
gösterilir. İki modda kaynağı farklıdır:

- **Tilavet modunda kesin.** Quran.com kelime bazlı zaman damgası
  (segments) verdiği için vurgulanan kelime sesin tam olarak okuduğu
  kelimedir. Ek bir ayar veya senkron gerekmez. Zaman damgaları her kari
  için ayrı tutulur. Kaynakta 36.384 kelime-zamanının 172'si (%0,5) eksik;
  o kelimeler vurgulanmadan geçilir, oynatma etkilenmez.
- **Meal modunda tahmini.** Kelime zaman damgası olmadığından konum,
  ayet içindeki ilerlemeden kelime uzunluklarına göre kestirilir;
  aşağıdaki senkron adımı yapıldıkça isabeti artar. Ayarlar'dan
  kapatılabilir.

### Arapça hat desteği

Arapça metin Uthmani imlasıyla gelir ve vakf işaretleri (ۖ ۢ ۭ) içerir.
Uygulama harici font yüklemez — offline'da da aynı görünsün diye
sistemdeki Arapça hatlar kullanılır. Cihazınızda bu işaretler kutu (▯)
görünüyorsa ya sadeleştirilmiş metne geçmek ya da bir Kur'an fontunu
uygulamayla birlikte paketlemek gerekir.

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

Ses dosyaları büyük olduğu için otomatik indirilmez. Okuma ekranındaki
**"Offline'a indir"** ile o an seçili ses kaynağı sure sure indirilir;
indirilenler "Kaldır" ile silinebilir.

Tilavet ayet başına ayrı dosya olduğundan indirme dosya dosya ilerler
(örn. Kehf için 111 parça). Türkçe meal ise sure başına tek büyük
dosyadır (Mülk 13 MB, Yasin 28 MB, Vakıa 15 MB, Kehf 59 MB).

Bu adım şart: `<audio>` elementi ses dosyalarını her zaman Range
(206 Partial Content) isteğiyle çeker ve kısmi yanıtlar cache'lenmez —
yani sadece dinlemek dosyayı offline'a almaz. İndirme, tam dosyayı
service worker'ın okuduğu cache'e yazar; workbox'ın `rangeRequests`
eklentisi de bu tam yanıttan Range dilimlerini servis eder.

> **Kısıt yalnızca Türkçe meal sesinde:** `audio.acikkuran.com`
> yanıtlarında `Access-Control-Allow-Origin` başlığı yok, bu yüzden
> indirme tarayıcı tarafından engellenir (dinleme etkilenmez, `<audio>`
> CORS istemez). Quran.com tarafı `Access-Control-Allow-Origin: *`
> gönderdiği için **tilavet offline'a sorunsuz indirilebilir**.

## GitHub Pages

`.github/workflows/deploy.yml`, varsayılan dala her push'ta siteyi
yayınlar. Depo ayarlarında **Settings → Pages → Source** mutlaka
**GitHub Actions** olmalıdır.

"Deploy from a branch" seçilirse GitHub depo kökünü olduğu gibi sunar;
bu bir Vite projesi olduğu için derlenmemiş `index.html` yayınlanır,
`/src/main.jsx` bulunamaz ve site boş açılır. Workflow bunu kendi
düzeltmeyi dener (`configure-pages` `enablement: true`), ama ayar elle
de değiştirilebilir.

Pages projeyi `/<depo-adı>/` altında sunduğu için build `BASE_PATH` ile
yapılır; workflow bunu depo adından otomatik verir. Yerelde kök dizin
kullanılır, ek bir şey gerekmez.

## Build

```bash
npm run build
```

## Teknoloji

- React + Vite
- Tailwind CSS v4
- vite-plugin-pwa (offline service worker, manifest)
- State: React hooks + localStorage (ek state kütüphanesi yok)
