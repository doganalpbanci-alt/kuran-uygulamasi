# Günlük Kur'an

Kıraat dinlerken Türkçe okunuşu ve meali eş zamanlı takip edebileceğin, offline
çalışan bir PWA. Günlük okuma alışkanlığı için basit bir streak takibi içerir.

Kapsam (16 bölüm): nüzûl sırasının ilk onu — Alak, Kalem, Müzzemmil,
Müddessir, Fatiha, Tebbet, Tekvir, A'lâ, Leyl, Fecr — ve ayrıca Yasin,
Mülk, Vakıa, Kehf, Duhan sureleri ile Âmenerrasûlü (Bakara 285-286).

Ana ekrandan **Mushaf sırası** ile **Nüzûl sırası** (iniş sırası) arasında
geçiş yapılır; nüzûl seçilince bölümler iniş sırasına dizilir ve sıra
numarası görünür.

## Veri mimarisi

Ayet ve tefsir verisi uygulamayla paketlenmez. `src/data/index.json`
(~11 KB) yalnızca bölüm listesi, kariler, mealler ve tefsir listesini
taşır; her bölümün ayetleri `public/data/surah-<id>.json`, tefsiri
`public/data/tafsir-<tefsir>-<id>.json` dosyasındadır ve bölüm ilk
açıldığında indirilip service worker tarafından kalıcı olarak
cache'lenir.

Sebep boyut: her şey tek pakettiyken 6 bölüm 602 KB gzip tutuyordu ve
nüzûl sırasıyla okumak için gereken sure sayısında bu birkaç MB'a
çıkıyordu. Şimdi uygulama 76 KB gzip; indirilen bölüm ise kalıcı olarak
çevrimdışı çalışır. Bedeli, bir bölümün **ilk** açılışında internet
gerekmesidir.

## Tefsir

Okuma ekranındaki **"Tefsiri aç"** ile açılır. Tefsirler ayet ayet değil
ayet gruplarına göre yazıldığı için blok blok gösterilir (İbn Kesir'de
Alak 1-5 tek blok).

Şu an tek kaynak var: **Ibn Kathir (Abridged)**, İngilizce, quran.com
üzerinden. **Türkçe tefsir hiçbir açık API'de bulunamadı** — quran.com'un
20 tefsirinin hiçbiri Türkçe değil (Arapça 7, Urduca 4, Bengalce 4,
İngilizce 3, Rusça 1, Kürtçe 1), Açık Kuran'da tefsir ucu yok, Diyanet'in
açık API'si yok. Türkçe kaynak araştırması sürüyor.

Blok sınırları `tafsirs/<id>/by_chapter/<sure>` ucundan çıkarılıyor: bu uç
sureyi ayet ayet döndürüyor ve metni yalnızca bloğun **ilk** ayetine
koyuyor, sonrakiler boş geliyor — yani bir metin, bir sonraki dolu ayete
kadar sürüyor.

> `by_ayah` ucu bu iş için kullanılamaz. `verses` alanında bloğun gerçek
> aralığını değil sabit 10'luk bir pencere veriyor (74:11 sorgusunda
> "11-20" diyor, oysa blok 11-30'u kapsıyor) ve aralık dışı bir ayet
> sorulduğunda hata vermek yerine sessizce bir önceki bloğu döndürüyor.
> Bu uca dayanan ilk sürüm hem aralıkları yanlış etiketliyor hem aynı
> bloğu tekrar tekrar kaydediyordu; Müddessir'de 21-30 ile 48-56 hiçbir
> bloğa düşmüyordu.

Tefsir metni kaynakta HTML olarak geliyor; çekerken script/style/olay
öznitelikleri ayıklanıyor (`sanitizeHtml`).

Bölüm eklemek için `scripts/fetch-surahs.mjs` içindeki `ENTRIES` listesine
`{ surah: 44 }` gibi bir kayıt eklemek yeterli. Bir surenin bir bölümü
alınacaksa `from`/`to` verilir; bu durumda besmele satırı eklenmez ve
Türkçe meal sesi olmaz (Açık Kuran sesi sure başına tek dosya sunuyor,
Âmenerrasûlü için bu Bakara'nın tamamı olurdu). Arapça tilavet ayet
başına ayrı dosya olduğundan kısmi bölümlerde de sorunsuz çalışır.

## Günlük Okumalar

Ana ekrandaki 📿 ile açılır. Sahih hadislerde sabah-akşam, namaz sonrası
veya yatmadan önce okunması geçen 15 öğelik sabit bir liste —
`src/data/daily-recitations.json`. İki türü var:

- **`type: "quran"` / `"quran-group"`** — İhlâs+Felâk+Nâs, Âyetü'l-Kürsî
  (Bakara 255), Âmenerrasûlü, Mülk, Haşr'ın son 3 âyeti. Bunların metni
  burada tekrar yazılmaz; `entryId`/`entryIds` alanı `src/data/index.json`
  içindeki gerçek bölüme işaret eder ve dokununca doğrudan mevcut
  `ReadingScreen`'e (tüm ses/tefsir/meal altyapısıyla) gidilir. Âyetü'l-
  Kürsî ve Haşr'ın son 3 âyeti, Âmenerrasûlü'nün kullandığı `from`/`to`
  düzeniyle `scripts/fetch-surahs.mjs`'in `ENTRIES` listesine eklendi —
  hassas bir konuda ikinci bir elle Kur'an metnini yeniden yazmamak,
  tek doğrulanmış kaynaktan (Açık Kuran + Quran.com, `verify-data.mjs`
  ile çapraz kontrollü) beslenmek için. Bir öğenin verisi henüz
  çekilmemişse (`getEntry` bulamazsa) ekran çökmek yerine "Veri
  hazırlanıyor" gösterip devre dışı bırakır.
- **`type: "dhikr"`** — 10 hadis kaynaklı zikir/dua (Sayyidü'l-İstiğfar,
  korunma duası, rıza duası, afiyet duası, sabah rızık duası, sübhânallâhi
  ve bihamdihî, kelime-i tevhid, "cennet hazinesi", evden çıkış duası,
  yatış duası). Bunlar Kur'an değil; kendi `arabic`/`transliteration`/
  `meaning` alanlarını taşıyıp ayrı bir `DhikrDetailScreen`'de gösterilir.

Metinler tek kaynaktan (kullanıcının verdiği hadis atfı) değil, her biri
için bağımsız aramayla (mümkün olduğunda iki farklı kaynaktan) çapraz
doğrulandı. Doğrulama bir gerçek sorun çıkardı: **Rıza Duası**'nın
"…ve rasûlâ" ile biten hâli hiçbir hadiste birebir geçmiyor, ve
"sabah/akşam" olarak bilinen rivayet (İbn Mâce) zayıf (dai'f) kabul
ediliyor. Uygulamadaki metin bunun yerine yalnızca akşama özgü, daha
sağlam Tirmizî rivayetini ("...nebiyyen" ile biten, hasen-garîb) kullanır
ve kaynak alanında bu derecelendirme açıkça belirtilir
(`"Tirmizî, De'avât, 13 (hasen-garîb)"`). Diğer dokuz zikir/dua sahih
olarak doğrulandı; ikisinde (Korunma ve Afiyet duaları, Ebû Dâvûd'un
Edeb kitabındaki 101 ve 110 numaralı babları) metin ve hadis sahihliği
teyit edildi ama bab numarası farklı baskı/konkordans farkları yüzünden
bağımsızca doğrulanamadı — yanlış olduklarına dair bir bulgu da yok.

## Kur'an tabanlı öğeler ve sekme

Sure ekranı üç sekmeden oluşur:

- **Arapça + Meal** (varsayılan) — Arapça metin, altında seçili meal.
  Arka planda Arapça tilavet çalar, aktif ayet ve okunan kelime vurgulanır.
- **Okunuş** — Arapça metin, altında Latin okunuşu. Yine tilavet eşliğinde;
  sesi takip ederek okumak için.
- **Meal** — sadece meal, kesintisiz okuma için. Ayrıca "Meali dinle" ile
  Türkçe meal sesi çalınabilir.

Ses kaynakları:

- **Arapça tilavet** — 23 kari arasından seçilebilir (varsayılan Mishari
  Rashid al-Afasy). Kariler takip seviyesine göre gruplanır, çünkü kelime
  zaman damgasını yalnızca Quran.com veriyor:

  | Seviye | Kari | Takip |
  |---|---|---|
  | `word` | Quran.com'un 12 karisi | kelime + ayet |
  | `verse` | everyayah'dan 11 kari (Yasser Al-Dosari, Maher Al-Muaiqly, Saad Al-Ghamdi, Al-Juhany, Al-Qatami, Jibreel, Fares Abbad, Al-Hudhaify, Ayyoub, Al-Budair, Mahmoud Ali Al-Banna) | yalnızca ayet |
  | `none` | Islam Sobhi (mp3quran) | takip yok, yalnızca dinleme |

  Zaman damgası taşımayan kariler (`verse` ve `none`) veri dosyasında
  değil `src/lib/extraReciters.js` içinde tanımlıdır — yeni bir tane
  eklemek tek satırdır, veriyi yeniden çekmek gerekmez.

  `verse` seviyesinde ayet başına ayrı dosya olduğu için çalan dosya
  zaten o ayettir — vurgu ve otomatik kaydırma çalışır, kelime imleci
  çalışmaz. `none` seviyesinde yalnızca sure başına tek kayıt vardır;
  hiçbir vurgu yapılmaz ve sure ortasından alınan bölümlerde (Âmenerrasûlü)
  bu kari kullanılamaz.

  Ayarlardan iki oynatma biçimi seçilir:

  - **Ayet ayet** (varsayılan) — her ayet ayrı kayıt. Geçişler için iki ses
    elementi dönüşümlü kullanılır: biri çalarken diğeri sıradaki ayeti
    tamamen yükler, böylece ayet arası bekleme kalmaz.
  - **Baştan sona kesintisiz** — sure tek kayıt olarak akar. Aktif ayet ve
    okunan kelime, dosyaya göre mutlak zaman damgalarından bulunur.

  Her iki biçimde de ayete dokununca o ayetin başına dönülür ve imleç
  oraya senkronlanır. Kesintisiz kayıt yalnızca tam surelerde vardır;
  Âmenerrasûlü gibi kısmi bölümlerde ayet ayet çalınır.

  Kaynak: ayet başına kayıt
  ([Quran.com API](https://api-docs.quran.foundation/)). Ayet senkronu
  kendiliğinden kesin; kelime zaman damgaları da geldiği için imleç
  okunan kelimeyi birebir takip eder. Kari, Ayarlar'dan değiştirilir ve
  zaman damgaları kari başına ayrı tutulduğu için imleç her karide
  doğrudur.
- **Türkçe meal sesi** — sure başına tek mp3
  ([Açık Kuran API](https://acikkuran.com/api)).

  > **Dikkat:** Bu kayıt, ekranda seçili mealin seslendirmesi değildir.
  > Açık Kuran sure başına tek bir Türkçe ses sunuyor ve `author`
  > parametresi ne olursa olsun aynı dosyayı döndürüyor — yani ses başka
  > bir çeviriden okunuyor. Bu yüzden meal dinlerken metinde ayet ya da
  > kelime vurgusu yapılmaz. Bu ses arka planda çalmaya devam eder ve
  > kilit ekranı kontrollerini destekler (Media Session API).

## Kari ve meal seçimi

Sure ekranındaki ⚙ ile açılan panelden kari ve meal anında
değiştirilebilir — ana ekrana dönüp Ayarlar'a girmeye gerek yok. Seçim
uygulandığında panel açık kalır, böylece karileri dinleyerek
karşılaştırmak kolaydır. Aynı listeler Ayarlar ekranında da var; ikisi
`src/components/Pickers.jsx` içindeki ortak bileşenleri kullanır.

12 meal arasından seçim yapılır; seçim bütün sekmelere uygulanır.

- **Türkçe** (Açık Kuran): Diyanet İşleri, Elmalılı Hamdi Yazır, Elmalılı
  (sadeleştirilmiş), Ali Bulaç, Muhammed Esed, Süleyman Ateş, Suat
  Yıldırım, Yaşar Nuri Öztürk
- **English** (Quran.com): Saheeh International, M.A.S. Abdel Haleem,
  M. Pickthall, A. Yusuf Ali

Offline çalışması için hepsi uygulamaya gömülüdür; liste bu yüzden dar
tutulmuştur. Genişletmek için `scripts/fetch-surahs.mjs` içindeki
`TR_TRANSLATION_IDS` / `EN_TRANSLATION_IDS` listelerine ekleyip scripti
yeniden çalıştırmak yeterli.

İki kaynağın id uzayları çakıştığı için (Açık Kuran'da 22 = Muhammed
Esed, Quran.com'da 22 = A. Yusuf Ali) id'ler `tr-11`, `en-20` biçiminde
öneklenir.

### Ayet ayet çeviren mealler

Bazı mealler birden çok ayeti tek cümlede çevirip aynı metni o aralıktaki
her ayete tekrar yazar. 16 bölüm genelinde:

| Meal | Durum |
|---|---|
| Ali Bulaç, Muhammed Esed, Süleyman Ateş, Yaşar Nuri Öztürk | tamamen ayet ayet |
| Saheeh International, Abdel Haleem, Pickthall, Yusuf Ali | tamamen ayet ayet |
| Elmalılı (sadeleştirilmiş) | 2 grup |
| Elmalılı Hamdi Yazır | 4 grup |
| Suat Yıldırım | 76 grup (%29 ayet birleşik) |
| Diyanet İşleri | 76 grup (%29 ayet birleşik) |

Tilavet ve okunuş sekmelerinde meal her ayetin altında gösterilir —
birleşik çevirilerde metin tekrar eder, bu ayet takibini kolaylaştırdığı
için bilinçli bir tercihtir. **Meal sekmesinde** ise ardışık aynı metinler
tek bloğa toplanır ve `3-7` gibi bir aralık etiketiyle gösterilir; metnin
başındaki `(3-7)` öneki ayıklanır. Gruplama seçili meale göre çalışma
anında hesaplanır (Yasin'de Diyanet 77 blok, Ali Bulaç 83 blok verir).

Okunuş ve meal metinleri Açık Kuran'dan, Arapça kelime metinleri ve
tefsir Quran.com'dan gelir; hepsi build-time çekilip yukarıdaki veri
dosyalarına yazılır.

## Geliştirme

```bash
npm install
npm run dev
```

## Sure verisini yeniden çekmek

Veri dosyaları build-time üretilir, uygulama çalışırken API'ye gitmez.
Yeniden çekmek için:

```bash
node scripts/fetch-surahs.mjs
```

## Veri doğrulama

Meal ve tefsir hassas içerik: tek ayetlik bir kayma sessizce yanlış anlam
üretir, üstelik ekranda gayet normal görünür. Bu yüzden çekme adımının
çıktısı ayrı bir scriptle kaynağa geri sorulur:

```bash
node scripts/verify-data.mjs   # hata varsa exit 1
```

Script çekme fonksiyonlarını kullanmaz, API'yi bağımsız olarak yeniden
sorgular — çekmedeki bir hata doğrulamada tekrarlanmasın diye. Örnekleme
de yapmaz: **her bölümün her ayetini, her meal için tek tek** karşılaştırır,
çünkü kayma hatası tam olarak örneklemenin kaçırdığı hatadır. Denetlenenler:

- ayet sayısı ve numaraların sürekliliği,
- 8 Türkçe mealin her ayeti (Açık Kuran'dan yazar yazar),
- 4 İngilizce mealin her ayeti (`verse_key` + `resource_id` ile eşleştirilerek),
- Arapça kelimelerin birleşimi ile ayetin kendi metni,
- tefsir bloklarının kaynaktan bağımsız yeniden kurulup birebir tutması ve
  bölümü boşluksuz kapsaması.

Karşılaştırmadan elenen üç fark var; hiçbiri harf/anlam farkı değil:
dipnot referansları (`<sup>`, uygulamada da gösterilmiyor), yalnızca kelime
bazlı metinde bulunan iklab işaretleri (U+06ED, U+06E2) ve birleşik işaret
sırası (NFC ile eşitleniyor: 81:1'de kaynak "şedde + fetha", kelime metni
"fetha + şedde" veriyor).

Son çalıştırmada 16 bölümün tamamında **320 kontrolün 320'si** geçiyor.

## Favoriler, yer işaretleri ve erişilebilirlik

Üçü de `localStorage`'da tutulur (`lib/favorites.js`, `lib/bookmarks.js`,
`lib/appearance.js`); veri çekme mimarisiyle ilgisi yok, uygulama
çalışırken eklenip kaldırılır.

- **Favoriler.** Ana ekrandaki sure kartlarının ☆'ı ve okuma ekranı
  başlığındaki ☆ aynı listeye yazar. "★ Favoriler" filtresi ana ekranda
  yalnızca favorileri gösterir; sıralama (mushaf/nüzûl) filtreden bağımsız
  çalışmaya devam eder.
- **Yer işaretleri.** Arapça+Meal ve Okunuş sekmelerinde her ayetin
  yanındaki 🔖 ile o ayete yer imi konur. Bölüm verisi lazy yüklendiği
  için Yer İşaretlerim ekranı ayrıca indirme yapmasın diye sure adı ve
  kısa bir önizleme (okunuşun ilk ~90 karakteri) işaretlenirken
  denormalize edilip saklanır. Listeden bir yer imine dokunmak ilgili
  bölümü açıp o ayete bir kez kaydırır ve teal bir halkayla vurgular —
  bu, o an çalan ayeti gösteren altın halkadan bilerek farklı bir renk
  (ikisi karışmasın diye). Meal sekmesi ayetleri aralık bazlı gruplandığı
  için (bkz. altındaki tablo) yer iminden gelindiğinde sekme otomatik
  olarak Arapça+Meal'e döner.
- **Erişilebilirlik.** Ayarlar'daki yazı boyutu (5 kademe) ve okuma fontu
  (Serif/Sans) seçimi yalnızca okuma alanını ölçekler — Arapça metin,
  meal, okunuş, tefsir. Üst bar, düğmeler ve boşluklar Tailwind'in sabit
  sınıflarını kullanmaya devam ettiği için düzen bozulmaz. Uygulama bunu
  tek bir `--font-scale` CSS değişkeniyle yapar; bileşenler boyutu
  doğrudan yazmak yerine `calc(1rem*var(--font-scale,1))` gibi ifadelerle
  bu değişkeni okur. Font seçimi de aynı mantıkla `--font-reading`
  değişkenini günceller (bileşenler zaten `font-[var(--font-reading)]`
  kullanıyordu, ek değişiklik gerekmedi). Her iki değişken de sayfa ilk
  render edilmeden önce `main.jsx`'te uygulanır ki kayıtlı ayar bir an
  için varsayılana dönüp geri sıçramasın.

## Kelime imleci

Ses çalarken o an okunan kelime vurgulanır; öncesi koyu, sonrası soluk
gösterilir. İki modda kaynağı farklıdır:

- **Tilavet modunda kesin.** Quran.com kelime bazlı zaman damgası
  (segments) verdiği için vurgulanan kelime sesin tam olarak okuduğu
  kelimedir. Ek bir ayar veya senkron gerekmez. Zaman damgaları her kari
  için ayrı tutulur. Kaynakta 57.072 kelime-zamanının 224'ü (%0,4) sıfır
  uzunlukta; o kelimeler vurgulanmadan geçilir, oynatma etkilenmez.
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
