/**
 * Ayar kaydı — portalın yönetilebilir her değeri burada **bir kez** tanımlanır.
 *
 * Eskiden bir ayar eklemek beş yere dokunmayı gerektiriyordu: varsayılan,
 * zod şeması, formData eşlemesi, setSettings yükü ve form satırı. Anahtar
 * sayısı 19'dan ~70'e çıkarken bu sürdürülemezdi. Artık anahtar yalnızca
 * aşağıdaki tabloya yazılıyor; doğrulama (lib/settings-validate.ts), kaydetme
 * eylemi ve ayar formu tabloyu gezerek kendi işini kendisi çıkarıyor.
 *
 * Bu modül bilinçli olarak veritabanına ve zod'a dokunmaz: istemci
 * bileşenleri (ayar formu, bülten okuyucu) seçenek listelerini buradan alır.
 */

// ————————————————————————————————————————————————
// Seçenek listeleri
// ————————————————————————————————————————————————

export type EnumOption = {
  value: string;
  label: string;
  /** Renk seçiminde gösterilen örnek kare. */
  swatch?: string;
  /** Punto seçiminde örnek harfin gerçek ölçeği. */
  sample?: string;
};

/** Bir etiketin başlığa göre konumu. */
export const PLACE_OPTIONS = [
  { value: "ustte", label: "Üstte" },
  { value: "altta", label: "Altta" },
  { value: "gizli", label: "Gizli" },
] as const satisfies readonly EnumOption[];

/** Punto kademeleri — her kademe mobil + masaüstü çifti olarak tanımlı. */
export const SIZE_OPTIONS = [
  { value: "kucuk", label: "Küçük", sample: "Aa" },
  { value: "normal", label: "Normal", sample: "Aa" },
  { value: "buyuk", label: "Büyük", sample: "Aa" },
  { value: "cok-buyuk", label: "Çok büyük", sample: "Aa" },
] as const satisfies readonly EnumOption[];

/**
 * Yazı renkleri.
 *
 * Seçenekler kurumsal paletle sınırlı ve **anlamsal** karşılıklara eşleniyor
 * (lib/appearance.ts): gece modunda "Koyu" seçimi siyah üstüne siyah
 * üretmesin diye.
 */
export const COLOR_OPTIONS = [
  { value: "otomatik", label: "Varsayılan", swatch: "transparent" },
  { value: "koyu", label: "Koyu", swatch: "#1d252d" },
  { value: "orta", label: "Orta", swatch: "#4a5057" },
  { value: "soluk", label: "Soluk", swatch: "#777b81" },
  { value: "kirmizi", label: "Kurumsal kırmızı", swatch: "#ce2028" },
  { value: "yesil", label: "TFS yeşili", swatch: "#9ed660" },
] as const satisfies readonly EnumOption[];

export const ALIGN_OPTIONS = [
  { value: "sol", label: "Sola yaslı" },
  { value: "orta", label: "Ortalı" },
  { value: "sag", label: "Sağa yaslı" },
] as const satisfies readonly EnumOption[];

export const WIDTH_OPTIONS = [
  { value: "dar", label: "Dar" },
  { value: "orta", label: "Orta" },
  { value: "genis", label: "Geniş" },
  { value: "tam", label: "Tam genişlik" },
] as const satisfies readonly EnumOption[];

export const LIST_MODE_OPTIONS = [
  { value: "liste", label: "Yalnızca liste" },
  { value: "kart", label: "Yalnızca kart" },
  { value: "ikisi", label: "Liste ve kart" },
] as const satisfies readonly EnumOption[];

export const HERO_HEIGHT_OPTIONS = [
  { value: "kisa", label: "Kısa" },
  { value: "orta", label: "Orta" },
  { value: "yuksek", label: "Yüksek" },
] as const satisfies readonly EnumOption[];

export const HERO_STYLE_OPTIONS = [
  { value: "fotograf", label: "Fotoğraflı" },
  { value: "gradyan", label: "Fotoğrafsız (marka gradyanı)" },
] as const satisfies readonly EnumOption[];

export const HERO_FOCAL_OPTIONS = [
  { value: "ust", label: "Üst" },
  { value: "orta", label: "Orta" },
  { value: "alt", label: "Alt" },
] as const satisfies readonly EnumOption[];

export const HERO_SCRIM_OPTIONS = [
  { value: "otomatik", label: "Otomatik" },
  { value: "normal", label: "Normal" },
  { value: "guclu", label: "Güçlü" },
] as const satisfies readonly EnumOption[];

export const THEME_OPTIONS = [
  { value: "acik", label: "Gündüz" },
  { value: "koyu", label: "Gece" },
  { value: "sistem", label: "Ziyaretçinin cihazına göre" },
] as const satisfies readonly EnumOption[];

export const SORT_OPTIONS = [
  { value: "tarih-yeni", label: "En yeni önce" },
  { value: "tarih-eski", label: "En eski önce" },
  { value: "no-azalan", label: "Bülten no — azalan" },
  { value: "no-artan", label: "Bülten no — artan" },
] as const satisfies readonly EnumOption[];

export const ANNOUNCEMENT_OPTIONS = [
  { value: "bilgi", label: "Bilgi (sakin)" },
  { value: "uyari", label: "Uyarı (kırmızı vurgu)" },
  { value: "kritik", label: "Kritik (dolu kırmızı bant)" },
] as const satisfies readonly EnumOption[];

// ————————————————————————————————————————————————
// Kayıt girdisinin biçimi
// ————————————————————————————————————————————————

export const SETTING_GROUPS = [
  {
    id: "metin",
    title: "Metin ve Görünüm",
    hint: "Her yazının metni, puntosu ve rengi bir arada — portalda nerede göründüğüne göre.",
  },
  {
    id: "anasayfa",
    title: "Ana Sayfa Yerleşimi",
    hint: "Hangi bölüm görünsün, nerede dursun, nasıl dizilsin.",
  },
  {
    id: "bulten",
    title: "Bülten Görünümü",
    hint: "Sıralama, önizleme ve sayaçlar.",
  },
  {
    id: "duyuru",
    title: "Duyuru Bandı",
    hint: "Sekmelerin altında görünen şerit.",
  },
  {
    id: "tema",
    title: "Tema",
    hint: "Gece / gündüz modu. Yönetim paneli her zaman gündüz görünümünde kalır.",
  },
] as const;

export type SettingGroupId = (typeof SETTING_GROUPS)[number]["id"];

type Base = {
  label: string;
  help?: string;
  group: SettingGroupId;
  /** Grup içinde alt başlık — form bunları birlikte çerçeveler. */
  section?: string;
  /** Formda alan tam satır mı yarım satır mı kaplasın. */
  span?: "full" | "half";
  /**
   * Formda ÇİZİLMEZ ve "Ayarları kaydet" ile yazılmaz; yalnızca kendi özel
   * eylemi yazar (ör. hero görselinin yolu yükleme eylemiyle). Böylece
   * formun kaydedilmesi bu değerleri asla ezmez.
   */
  hidden?: true;
};

export type SettingDef =
  | (Base & {
      kind: "text";
      default: string;
      max: number;
      required?: boolean;
    })
  | (Base & { kind: "textarea"; default: string; max: number; rows?: number })
  | (Base & { kind: "bool"; default: "0" | "1"; description?: string })
  | (Base & { kind: "int"; default: string; min: number; max: number })
  | (Base & {
      kind: "enum";
      default: string;
      options: readonly EnumOption[];
      /** Hangi widget çizilsin. */
      control?: "select" | "segment" | "swatch" | "size";
    });

// ————————————————————————————————————————————————
// Kayıt
// ————————————————————————————————————————————————

export const SETTINGS = {
  // ————— Kimlik —————
  portal_title: {
    kind: "text",
    default: "SEÇ-K Portalı",
    max: 80,
    required: true,
    group: "metin",
    span: "half",
    label: "Portal adı",
    help: "Ana sayfadaki büyük başlık.",
  },
  portal_subtitle: {
    kind: "text",
    default: "Sağlık, Emniyet, Çevre ve Kalite",
    max: 120,
    group: "metin",
    span: "half",
    label: "Üst etiket",
    help: "Başlığın yanındaki küçük tanım satırı.",
  },
  home_intro: {
    kind: "textarea",
    default: "Sağlık, emniyet, çevre ve kalite bültenlerine buradan ulaşabilirsiniz.",
    max: 400,
    rows: 2,
    group: "metin",
    label: "Giriş metni",
    help: "Hero başlığının altındaki açıklama.",
  },
  footer_note: {
    kind: "text",
    default: "Şirket içi kullanım içindir",
    max: 200,
    group: "metin",
    span: "half",
    label: "Alt bilgi notu",
  },
  footer_company: {
    kind: "text",
    default: "Turkish Fuel Services",
    max: 80,
    group: "metin",
    span: "half",
    label: "Alt bilgi şirket adı",
  },
  logo_subtitle_show: {
    kind: "bool",
    default: "0",
    group: "metin",
    label: "Logonun yanında yazı görünsün",
    description: "Kapalıyken yalnızca logo durur; aynı ad hero başlığında zaten var.",
  },
  logo_subtitle_text: {
    kind: "text",
    default: "",
    max: 60,
    group: "metin",
    span: "half",
    label: "Logo yanı yazısı",
    help: "Boş bırakılırsa portal adı kullanılır.",
  },

  // ————— Ana sayfa yerleşimi —————
  hero_height: {
    kind: "enum",
    default: "yuksek",
    control: "segment",
    options: HERO_HEIGHT_OPTIONS,
    group: "anasayfa",
    section: "Hero",
    span: "half",
    label: "Hero yüksekliği",
  },
  hero_align: {
    kind: "enum",
    default: "sol",
    control: "segment",
    options: [ALIGN_OPTIONS[0], ALIGN_OPTIONS[1]],
    group: "anasayfa",
    section: "Hero",
    span: "half",
    label: "Hero yazı hizası",
  },
  home_kicker_pos: {
    kind: "enum",
    default: "altta",
    control: "segment",
    options: PLACE_OPTIONS,
    group: "metin",
    section: "Hero",
    span: "half",
    label: "Üst etiketin konumu",
    help: "Portal adının üstünde mi, altında mı görünsün — ya da hiç görünmesin.",
  },
  home_hero_style: {
    kind: "enum",
    default: "fotograf",
    control: "segment",
    options: HERO_STYLE_OPTIONS,
    group: "anasayfa",
    section: "Hero",
    span: "half",
    label: "Arka plan",
    help: "Fotoğraflı seçiliyken yüklenen görsel, yoksa paketle gelen görsel kullanılır.",
  },
  home_hero_focal: {
    kind: "enum",
    default: "orta",
    control: "segment",
    options: HERO_FOCAL_OPTIONS,
    group: "anasayfa",
    section: "Hero",
    span: "half",
    label: "Fotoğraf kadrajı",
    help: "Fotoğrafın hangi kısmı görünsün.",
  },
  home_hero_scrim: {
    kind: "enum",
    default: "otomatik",
    control: "segment",
    options: HERO_SCRIM_OPTIONS,
    group: "anasayfa",
    section: "Hero",
    span: "half",
    label: "Yazı perdesi",
    help: "Otomatik, görselin parlaklığına göre seçer. Parlak fotoğrafta Güçlü yazıyı okunur tutar.",
  },
  // Yükleme eyleminin yazdığı değerler — formda çizilmez (hidden).
  home_hero_path: {
    kind: "text",
    default: "",
    max: 200,
    hidden: true,
    group: "anasayfa",
    label: "Hero görseli yolu",
  },
  home_hero_blur: {
    kind: "text",
    default: "",
    max: 4096,
    hidden: true,
    group: "anasayfa",
    label: "Hero bulanık ön izleme",
  },
  home_hero_brightness: {
    kind: "int",
    default: "0",
    min: 0,
    max: 255,
    hidden: true,
    group: "anasayfa",
    label: "Hero görseli parlaklığı",
  },
  show_search_band: {
    kind: "bool",
    default: "1",
    group: "anasayfa",
    section: "Hero",
    label: "Hero altında arama bandı görünsün",
    description: "Koyu bant içinde tüm bültenlerde arama kutusu.",
  },
  home_list_mode: {
    kind: "enum",
    default: "ikisi",
    control: "segment",
    options: LIST_MODE_OPTIONS,
    group: "anasayfa",
    section: "Son yayımlananlar",
    span: "half",
    label: "Görünüm",
    help: "Liste taramak, kart göz gezdirmek için. İkisi birden de olabilir.",
  },
  home_block_position: {
    kind: "enum",
    default: "sol",
    control: "segment",
    options: ALIGN_OPTIONS,
    group: "anasayfa",
    section: "Son yayımlananlar",
    span: "half",
    label: "Bloğun konumu",
    help: "Bölümün sayfadaki yeri.",
  },
  home_block_width: {
    kind: "enum",
    default: "tam",
    control: "segment",
    options: WIDTH_OPTIONS,
    group: "anasayfa",
    section: "Son yayımlananlar",
    span: "half",
    label: "Blok genişliği",
  },
  home_block_align: {
    kind: "enum",
    default: "sol",
    control: "segment",
    options: ALIGN_OPTIONS,
    group: "anasayfa",
    section: "Son yayımlananlar",
    span: "half",
    label: "Yazı hizası",
    help: "Blok içindeki metinlerin hizası.",
  },
  home_recent_count: {
    kind: "int",
    default: "6",
    min: 3,
    max: 24,
    group: "anasayfa",
    section: "Son yayımlananlar",
    span: "half",
    label: "Gösterilecek bülten sayısı",
    help: "3 ile 24 arası.",
  },
  show_surveys_section: {
    kind: "bool",
    default: "1",
    group: "anasayfa",
    section: "Bölümler",
    label: "Anket bölümü açık",
    description: "Kapalıyken ana sayfadaki anket listesi ve Anketler sekmesi gizlenir.",
  },

  // ————— Arayüz metinleri —————
  nav_home_label: {
    kind: "text",
    default: "Ana Sayfa",
    max: 40,
    group: "metin",
    section: "Menü",
    span: "half",
    label: "Ana sayfa sekmesi",
  },
  nav_surveys_label: {
    kind: "text",
    default: "Anketler",
    max: 40,
    group: "metin",
    section: "Menü",
    span: "half",
    label: "Anketler sekmesi",
  },
  nav_admin_label: {
    kind: "text",
    default: "Yönetim",
    max: 40,
    group: "metin",
    section: "Menü",
    span: "half",
    label: "Yönetim düğmesi",
  },
  page_category_eyebrow: {
    kind: "text",
    default: "",
    max: 60,
    group: "metin",
    section: "Bülten sekmeleri",
    span: "half",
    label: "Sekme üst etiketi",
    help: "Sekme başlığının yanında görünen küçük yazı. Boşsa gösterilmez.",
  },
  page_category_eyebrow_pos: {
    kind: "enum",
    default: "gizli",
    control: "segment",
    options: PLACE_OPTIONS,
    group: "metin",
    section: "Bülten sekmeleri",
    span: "half",
    label: "Üst etiketin konumu",
  },
  reader_index_title: {
    kind: "text",
    default: "Bülten indeksi",
    max: 60,
    group: "metin",
    section: "Bülten sekmeleri",
    span: "half",
    label: "Liste başlığı",
  },
  page_search_eyebrow: {
    kind: "text",
    default: "Arama",
    max: 60,
    group: "metin",
    section: "Arama sayfası",
    span: "half",
    label: "Üst etiket",
  },
  page_search_title: {
    kind: "text",
    default: "Tüm bültenlerde ara",
    max: 120,
    group: "metin",
    section: "Arama sayfası",
    span: "half",
    label: "Başlık",
    help: "Arama yapıldığında yerini sonuç başlığı alır.",
  },
  page_search_desc: {
    kind: "text",
    default: "Bülten numarası veya konuya göre arayın. Türkçe karakter yazmanız gerekmez.",
    max: 240,
    group: "metin",
    section: "Arama sayfası",
    label: "Açıklama",
  },
  page_surveys_eyebrow: {
    kind: "text",
    default: "Değerlendirme",
    max: 60,
    group: "metin",
    section: "Anketler sayfası",
    span: "half",
    label: "Üst etiket",
  },
  page_surveys_title: {
    kind: "text",
    default: "Açık Anketler",
    max: 120,
    group: "metin",
    section: "Anketler sayfası",
    span: "half",
    label: "Başlık",
  },
  page_surveys_desc: {
    kind: "text",
    default: "Aşağıdaki anketler doldurulmaya açıktır. QR kodla da erişebilirsiniz.",
    max: 240,
    group: "metin",
    section: "Anketler sayfası",
    label: "Açıklama",
  },
  section_survey_title: {
    kind: "text",
    default: "Açık Anket",
    max: 60,
    group: "metin",
    section: "Bölüm başlıkları",
    span: "half",
    label: "Anket bölümü",
  },
  section_recent_title: {
    kind: "text",
    default: "Son Yayımlananlar",
    max: 60,
    group: "metin",
    section: "Bölüm başlıkları",
    span: "half",
    label: "Bülten bölümü",
  },
  btn_search: {
    kind: "text",
    default: "Ara",
    max: 40,
    group: "metin",
    section: "Düğmeler",
    span: "half",
    label: "Arama düğmesi",
  },
  btn_open: {
    kind: "text",
    default: "Aç",
    max: 40,
    group: "metin",
    section: "Düğmeler",
    span: "half",
    label: "Kart aç düğmesi",
  },
  btn_download: {
    kind: "text",
    default: "PDF indir",
    max: 40,
    group: "metin",
    section: "Düğmeler",
    span: "half",
    label: "İndirme düğmesi",
  },
  btn_new_tab: {
    kind: "text",
    default: "Yeni sekmede aç",
    max: 40,
    group: "metin",
    section: "Düğmeler",
    span: "half",
    label: "Yeni sekme düğmesi",
  },
  btn_survey: {
    kind: "text",
    default: "Doldur",
    max: 40,
    group: "metin",
    section: "Düğmeler",
    span: "half",
    label: "Anket düğmesi",
  },
  badge_new: {
    kind: "text",
    default: "Yeni",
    max: 20,
    group: "metin",
    section: "Rozet",
    span: "half",
    label: "Yeni rozeti yazısı",
  },
  badge_new_days: {
    kind: "int",
    default: "7",
    min: 1,
    max: 90,
    group: "metin",
    section: "Rozet",
    span: "half",
    label: "Kaç gün yeni sayılsın",
    help: "Bu süre içinde yayımlananlar rozet alır.",
  },
  empty_home: {
    kind: "text",
    default: "Henüz bülten yayımlanmamış. Yönetim panelinden PDF yükleyerek başlayabilirsiniz.",
    max: 240,
    group: "metin",
    section: "Boş liste mesajları",
    label: "Ana sayfa",
  },
  empty_category: {
    kind: "text",
    default: "Bu bölümde henüz yayımlanmış bülten yok.",
    max: 240,
    group: "metin",
    section: "Boş liste mesajları",
    label: "Bülten sekmesi",
  },
  empty_surveys: {
    kind: "text",
    default: "Şu anda doldurulmaya açık anket bulunmuyor.",
    max: 240,
    group: "metin",
    section: "Boş liste mesajları",
    label: "Anketler sayfası",
  },

  // ————— Punto ve renk —————
  // Yedi metin yuvası; her biri için boyut + renk. Sınıf karşılıkları
  // lib/appearance.ts içindeki statik tablolarda.
  type_home_title_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Ana sayfa başlığı",
    span: "half",
    label: "Punto",
  },
  type_home_title_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Ana sayfa başlığı",
    span: "half",
    label: "Renk",
  },
  type_home_kicker_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Ana sayfa üst etiketi",
    span: "half",
    label: "Punto",
  },
  type_home_kicker_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Ana sayfa üst etiketi",
    span: "half",
    label: "Renk",
  },
  type_home_intro_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Ana sayfa giriş metni",
    span: "half",
    label: "Punto",
  },
  type_home_intro_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Ana sayfa giriş metni",
    span: "half",
    label: "Renk",
  },
  type_page_title_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Sayfa başlıkları",
    span: "half",
    label: "Punto",
  },
  type_page_title_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Sayfa başlıkları",
    span: "half",
    label: "Renk",
  },
  type_page_eyebrow_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Sayfa üst etiketleri",
    span: "half",
    label: "Punto",
  },
  type_page_eyebrow_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Sayfa üst etiketleri",
    span: "half",
    label: "Renk",
  },
  type_nav_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Sekmeler",
    span: "half",
    label: "Punto",
  },
  type_nav_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Sekmeler",
    span: "half",
    label: "Renk",
  },
  type_section_title_size: {
    kind: "enum",
    default: "normal",
    control: "size",
    options: SIZE_OPTIONS,
    group: "metin",
    section: "Bölüm başlıkları",
    span: "half",
    label: "Punto",
  },
  type_section_title_color: {
    kind: "enum",
    default: "otomatik",
    control: "swatch",
    options: COLOR_OPTIONS,
    group: "metin",
    section: "Bölüm başlıkları",
    span: "half",
    label: "Renk",
  },

  // ————— Bülten görünümü —————
  default_sort: {
    kind: "enum",
    default: "tarih-yeni",
    control: "select",
    options: SORT_OPTIONS,
    group: "bulten",
    span: "half",
    label: "Varsayılan sıralama",
  },
  enable_pdf_preview: {
    kind: "bool",
    default: "1",
    group: "bulten",
    label: "PDF önizlemesi açık",
    description: "Kapalıyken bülten satırına tıklamak dosyayı doğrudan indirir.",
  },
  show_download_count: {
    kind: "bool",
    default: "0",
    group: "bulten",
    label: "İndirme sayısı görünsün",
    description: "Çalışanlar bir bültenin kaç kez indirildiğini görür.",
  },

  // ————— Duyuru bandı —————
  announcement: {
    kind: "textarea",
    default: "",
    max: 300,
    rows: 2,
    group: "duyuru",
    label: "Duyuru metni",
    help: "Boş bırakılırsa bant gösterilmez.",
  },
  announcement_level: {
    kind: "enum",
    default: "uyari",
    control: "select",
    options: ANNOUNCEMENT_OPTIONS,
    group: "duyuru",
    span: "half",
    label: "Önem düzeyi",
  },
  announcement_active: {
    kind: "bool",
    default: "1",
    group: "duyuru",
    label: "Duyuru yayında",
    description: "Metni silmeden geçici olarak kapatmak için kullanın.",
  },

  // ————— Tema —————
  theme_default: {
    kind: "enum",
    default: "acik",
    control: "segment",
    options: THEME_OPTIONS,
    group: "tema",
    label: "Varsayılan tema",
    help: "Ziyaretçi düğmeyle seçim yapmadıysa portal bu temayla açılır. Cihaza göre: ziyaretçinin bilgisayarı ya da telefonu gece modundaysa portal da gece açılır.",
  },
  theme_toggle_visible: {
    kind: "bool",
    default: "1",
    group: "tema",
    label: "Gece / gündüz düğmesi görünsün",
    description:
      "Üst bantta, Yönetim düğmesinin yanında. Kapalıyken herkes varsayılan temayı görür; ziyaretçilerin eski seçimleri de yok sayılır.",
  },
} as const satisfies Record<string, SettingDef>;

// ————————————————————————————————————————————————
// Türetilen tipler
// ————————————————————————————————————————————————

export type SettingKey = keyof typeof SETTINGS;

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, value);
}

/** Ayar formunda çizilen ve "Ayarları kaydet" ile yazılabilen anahtar mı? */
export function isFormKey(value: string): value is SettingKey {
  return isSettingKey(value) && !(SETTINGS[value] as SettingDef).hidden;
}

/** Ham (metin) ayar değerleri — veritabanında saklanan biçim. */
export type PortalSettings = Record<SettingKey, string>;

export const SETTING_DEFAULTS = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, SETTINGS[key].default]),
) as { [K in SettingKey]: (typeof SETTINGS)[K]["default"] };

type EnumValueOf<D> = D extends { options: readonly (infer O)[] }
  ? O extends { value: infer V extends string }
    ? V
    : never
  : never;

type ValueOf<D> = D extends { kind: "bool" }
  ? boolean
  : D extends { kind: "int" }
    ? number
    : D extends { kind: "enum" }
      ? EnumValueOf<D>
      : string;

/** Tipi çözülmüş ayarlar: boolean boolean, sayı sayı, enum dar birleşim. */
export type TypedSettings = {
  [K in SettingKey]: ValueOf<(typeof SETTINGS)[K]>;
};

// ————————————————————————————————————————————————
// Geriye dönük uyumluluk
//
// Bu türetilmiş alanlar kayıt tablosundan önce de vardı ve 14 çağrı yerinde
// kullanılıyor. announcementVisible tek anahtardan türetilemez (metin dolu
// OLMALI ve bant açık olmalı); diğerleri artık birer takma ad.
// ————————————————————————————————————————————————

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export type AnnouncementLevel = (typeof ANNOUNCEMENT_OPTIONS)[number]["value"];

export const SORT_KEYS = SORT_OPTIONS.map((o) => o.value) as readonly SortKey[];

/** Listede kullanılan kısa etiketler — ayar ekranı uzun olanları gösterir. */
export const SORT_LABELS: Record<SortKey, string> = {
  "tarih-yeni": "En yeni",
  "tarih-eski": "En eski",
  "no-azalan": "Bülten no ↓",
  "no-artan": "Bülten no ↑",
};

export const ANNOUNCEMENT_LABELS: Record<AnnouncementLevel, string> = {
  bilgi: "Bilgi",
  uyari: "Duyuru",
  kritik: "Önemli",
};

export type ResolvedSettings = TypedSettings & {
  announcementVisible: boolean;
  /** @deprecated settings.announcement_level artık doğrudan tipli. */
  announcementLevel: AnnouncementLevel;
  /** @deprecated settings.home_recent_count artık sayı. */
  homeRecentCount: number;
  /** @deprecated settings.enable_pdf_preview artık boolean. */
  pdfPreviewEnabled: boolean;
  /** @deprecated settings.show_download_count artık boolean. */
  downloadCountVisible: boolean;
  /** @deprecated settings.show_surveys_section artık boolean. */
  surveysSectionVisible: boolean;
  /** @deprecated settings.default_sort artık tipli. */
  defaultSort: SortKey;
};
