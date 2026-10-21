import type { TextSlot } from "@/lib/appearance";
import type { SettingKey } from "@/lib/settings-schema";

/**
 * "Metin ve Görünüm" sekmesinin kart düzeni.
 *
 * Yazılar portalda NEREDE göründüklerine göre gruplanıyor: bir yazının
 * metni, puntosu ve rengi aynı kartta duruyor. Önceden metin bir sekmede,
 * punto başka bir sekmedeydi ve birini ayarlarken diğerini göremiyordunuz.
 *
 * Bu dosya bilinçli olarak React'tan ve veritabanından bağımsız:
 * tests/settings-layout.test.ts "metin" grubundaki her anahtarın tam olarak
 * bir kartta olduğunu doğruluyor. Bu sekme jenerik alan çiziciyi
 * kullanmadığı için, karta konmayı unutulan bir anahtar ekrandan görünmeden
 * düşerdi — test bunu yazarken yakalıyor.
 */
export type TextCard = {
  id: string;
  title: string;
  /** Portalda nerede göründüğü — kartın sağ üstünde yazar. */
  where: string;
  /** Punto + renk yuvası; yoksa kartta punto/renk seçimi olmaz. */
  slot?: TextSlot;
  /**
   * Önizlemede gösterilecek metnin anahtarı. Yazdıkça önizleme değişsin
   * diye bu alanın girdisi dinleniyor. Yoksa sunucudan gelen gerçek bir
   * örnek (ilk bülten sekmesinin adı) gösterilir.
   */
  previewKey?: SettingKey;
  fields: readonly SettingKey[];
  /** Kartın altında küçük bir not (ör. bu yazının başka ekranda düzenlendiği). */
  note?: { text: string; href?: string; linkText?: string };
};

export const TEXT_CARDS: readonly TextCard[] = [
  {
    id: "anasayfa-baslik",
    title: "Ana sayfa başlığı",
    where: "Hero — en büyük yazı",
    slot: "home_title",
    previewKey: "portal_title",
    fields: ["portal_title"],
  },
  {
    id: "anasayfa-etiket",
    title: "Ana sayfa üst etiketi",
    where: "Hero — başlığın yanındaki küçük etiket",
    slot: "home_kicker",
    previewKey: "portal_subtitle",
    fields: ["portal_subtitle", "home_kicker_pos"],
  },
  {
    id: "anasayfa-giris",
    title: "Ana sayfa giriş metni",
    where: "Hero — başlığın altındaki açıklama",
    slot: "home_intro",
    previewKey: "home_intro",
    fields: ["home_intro"],
  },
  {
    id: "sekmeler",
    title: "Sekmeler ve menü",
    where: "Üstteki gezinme çubuğu",
    slot: "nav",
    previewKey: "nav_home_label",
    fields: ["nav_home_label", "nav_surveys_label", "nav_admin_label"],
    note: {
      text: "Bülten sekmelerinin adları Sekmeler ekranından değiştirilir.",
      href: "/admin/kategoriler",
      linkText: "Sekmeler →",
    },
  },
  {
    id: "sayfa-baslik",
    title: "Sayfa başlıkları",
    where: "Bülten sekmeleri, arama ve anketler sayfasının başı",
    slot: "page_title",
    fields: ["page_search_title", "page_search_desc", "page_surveys_title", "page_surveys_desc"],
    note: {
      text: "Önizlemede ilk bülten sekmenizin adı görünür; sekme adları ve açıklamaları Sekmeler ekranından değiştirilir.",
      href: "/admin/kategoriler",
      linkText: "Sekmeler →",
    },
  },
  {
    id: "sayfa-etiket",
    title: "Sayfa üst etiketleri",
    where: "Sayfa başlığının yanındaki küçük yazı",
    slot: "page_eyebrow",
    previewKey: "page_search_eyebrow",
    fields: [
      "page_category_eyebrow",
      "page_category_eyebrow_pos",
      "page_search_eyebrow",
      "page_surveys_eyebrow",
    ],
  },
  {
    id: "bolum-baslik",
    title: "Bölüm başlıkları",
    where: "Ana sayfa bölümleri ve bülten listesinin başı",
    slot: "section_title",
    previewKey: "section_recent_title",
    fields: ["section_recent_title", "section_survey_title", "reader_index_title"],
  },
  {
    id: "dugmeler",
    title: "Düğmeler ve rozet",
    where: "Kartlar, arama, PDF ekranı",
    fields: [
      "btn_search",
      "btn_open",
      "btn_download",
      "btn_new_tab",
      "btn_survey",
      "badge_new",
      "badge_new_days",
    ],
  },
  {
    id: "bos-liste",
    title: "Boş liste mesajları",
    where: "Gösterilecek kayıt olmadığında",
    fields: ["empty_home", "empty_category", "empty_surveys"],
  },
  {
    id: "alt-bilgi",
    title: "Alt bilgi ve logo",
    where: "Sayfanın en altı ve logonun yanı",
    fields: ["footer_company", "footer_note", "logo_subtitle_show", "logo_subtitle_text"],
  },
];

/** Bir kartın formda çizdiği tüm anahtarlar — metin alanları + punto/renk. */
export function cardKeys(card: TextCard): SettingKey[] {
  const keys: SettingKey[] = [...card.fields];
  if (card.slot) {
    keys.push(`type_${card.slot}_size` as SettingKey, `type_${card.slot}_color` as SettingKey);
  }
  return keys;
}

/** Sekmenin çizdiği tüm anahtarlar. */
export function textCardKeys(): SettingKey[] {
  return TEXT_CARDS.flatMap(cardKeys);
}
