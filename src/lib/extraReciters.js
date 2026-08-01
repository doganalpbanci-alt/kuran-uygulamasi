/**
 * Zaman damgası taşımayan kariler.
 *
 * Kelime zaman damgasını yalnızca Quran.com veriyor; onun 12 karisi
 * surahs.json içinde, ayet ve kelime zamanlarıyla birlikte duruyor.
 * Buradakilerin ise saklanacak verisi yok — sadece ses adresi kalıbı.
 * Bu yüzden veri dosyasında değil burada tutuluyorlar: yeni bir kari
 * eklemek için veriyi yeniden çekmek gerekmiyor.
 *
 * sync:
 *   "verse" — ayet başına ayrı dosya var, çalan dosya zaten o ayet;
 *             ayet vurgusu ve otomatik kaydırma çalışır, kelime imleci çalışmaz.
 *   "none"  — yalnızca sure başına tek kayıt; hiçbir takip yapılamaz.
 */

const EVERYAYAH = "https://everyayah.com/data/";

/** everyayah adresleri Quran.com ile aynı kalıpta: önek + <sure3><ayet3>.mp3 */
const verseLevel = [
  ["ea-dosari", "Yasser Al-Dosari", "Yasser_Ad-Dussary_128kbps"],
  ["ea-muaiqly", "Maher Al-Muaiqly", "MaherAlMuaiqly128kbps"],
  ["ea-ghamdi", "Saad Al-Ghamdi", "Ghamadi_40kbps"],
  ["ea-juhany", "Abdullah Al-Juhany", "Abdullaah_3awwaad_Al-Juhaynee_128kbps"],
  ["ea-qatami", "Nasser Al-Qatami", "Nasser_Alqatami_128kbps"],
  ["ea-jibreel", "Muhammad Jibreel", "Muhammad_Jibreel_128kbps"],
  ["ea-abbad", "Fares Abbad", "Fares_Abbad_64kbps"],
  ["ea-hudhaify", "Ali Al-Hudhaify", "Hudhaify_128kbps"],
  ["ea-ayyoub", "Muhammad Ayyoub", "Muhammad_Ayyoub_128kbps"],
  ["ea-budair", "Salah Al-Budair", "Salah_Al_Budair_128kbps"],
  ["ea-banna", "Mahmoud Ali Al-Banna", "mahmoud_ali_al_banna_32kbps", "Mücevved"],
].map(([id, name, folder, style = null]) => ({
  id,
  name,
  style,
  sync: "verse",
  audio_base: `${EVERYAYAH}${folder}/`,
}));

/** Sure başına tek kayıt: önek + <sure3>.mp3 */
const surahLevel = [
  {
    id: "mq-sobhi",
    name: "Islam Sobhi",
    style: null,
    sync: "none",
    surah_base: "https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/",
  },
];

export const EXTRA_RECITERS = [...verseLevel, ...surahLevel];
