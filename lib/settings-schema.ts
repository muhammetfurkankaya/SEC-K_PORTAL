/**
 * Ayar anahtarları, varsayılanları ve seçenek listeleri.
 *
 * Bu modül bilinçli olarak veritabanına dokunmaz: istemci bileşenleri
 * (ör. ayar formu, bülten okuyucu) sıralama ve duyuru seçeneklerini buradan
 * alır. Sorgu fonksiyonları lib/db/queries/settings.ts içindedir — onu
 * import etmek Node modüllerini tarayıcı paketine taşırdı.
 */

export const SETTING_DEFAULTS = {
  // ————— Kimlik —————
  portal_title: "SEÇ-K Portalı",
  portal_subtitle: "Sağlık, Emniyet, Çevre ve Kalite",
  home_intro:
    "Bültenlere buradan ulaşabilir, öneri ve olay bildirimlerinizi QDMS üzerinden iletebilirsiniz.",
  footer_note: "Şirket içi kullanım içindir",

  // ————— QDMS bildirim kartları —————
  qdms_suggestion_url: "https://tqdms.turkishfuel.com/QDMS/QDMSNET/BSAT/Default.aspx",
  qdms_suggestion_title: "Öneri Bildir",
  qdms_suggestion_desc: "İyileştirme önerilerinizi QDMS Öneri Sistemi üzerinden iletin.",
  qdms_incident_url: "https://tqdms.turkishfuel.com/QDMS/QDMSNET/BSAT/Default.aspx",
  qdms_incident_title: "Olay Bildir",
  qdms_incident_desc: "Kaza, ramak kala ve tehlikeli durumları QDMS üzerinden bildirin.",

  // ————— Duyuru bandı —————
  announcement: "",
  /** bilgi | uyari | kritik */
  announcement_level: "uyari",
  announcement_active: "1",

  // ————— Bülten görünümü —————
  /** Ana sayfada listelenecek son bülten sayısı. */
  home_recent_count: "6",
  /** tarih-yeni | tarih-eski | no-azalan | no-artan */
  default_sort: "tarih-yeni",
  /** Bülten satırına tıklayınca sağda PDF önizlemesi açılsın mı? */
  enable_pdf_preview: "1",
  /** İndirme sayacı çalışanlara gösterilsin mi? */
  show_download_count: "0",

  // ————— Bölümler —————
  show_surveys_section: "1",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

/** Ham (metin) ayar değerleri. */
export type PortalSettings = Record<SettingKey, string>;

export const SORT_KEYS = ["tarih-yeni", "tarih-eski", "no-azalan", "no-artan"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  "tarih-yeni": "En yeni",
  "tarih-eski": "En eski",
  "no-azalan": "Bülten no ↓",
  "no-artan": "Bülten no ↑",
};

/** Ayar ekranındaki uzun açıklamalar — liste kısa etiketleri kullanır. */
export const SORT_DESCRIPTIONS: Record<SortKey, string> = {
  "tarih-yeni": "En yeni önce",
  "tarih-eski": "En eski önce",
  "no-azalan": "Bülten no — azalan",
  "no-artan": "Bülten no — artan",
};

export const ANNOUNCEMENT_LEVELS = ["bilgi", "uyari", "kritik"] as const;
export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];

export const ANNOUNCEMENT_LABELS: Record<AnnouncementLevel, string> = {
  bilgi: "Bilgi (sakin)",
  uyari: "Uyarı (kırmızı vurgu)",
  kritik: "Kritik (dolu kırmızı bant)",
};

/** Arayüzün kullandığı, tipi çözülmüş ayarlar. */
export type ResolvedSettings = PortalSettings & {
  announcementVisible: boolean;
  announcementLevel: AnnouncementLevel;
  homeRecentCount: number;
  pdfPreviewEnabled: boolean;
  downloadCountVisible: boolean;
  surveysSectionVisible: boolean;
  defaultSort: SortKey;
};
