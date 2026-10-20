import { getDb } from "@/lib/db";
import {
  ANNOUNCEMENT_LEVELS,
  SETTING_DEFAULTS,
  SORT_KEYS,
  type AnnouncementLevel,
  type PortalSettings,
  type ResolvedSettings,
  type SettingKey,
  type SortKey,
} from "@/lib/settings-schema";

/**
 * Portal ayarlarının okunması ve yazılması.
 *
 * Anahtar listesi ve seçenekler lib/settings-schema.ts içindedir; istemci
 * bileşenleri oradan import eder. Burada yalnızca veritabanı erişimi var.
 */

function isTruthy(value: string): boolean {
  return value === "1" || value === "true" || value === "on";
}

/** Ham ayar değerleri — kaydedilmemiş olanlar için varsayılanla birlikte. */
export function getRawSettings(): PortalSettings {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...SETTING_DEFAULTS } as PortalSettings;

  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    const value = stored.get(key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/**
 * Arayüzün kullandığı ayarlar.
 *
 * Sayı ve boolean alanlar burada bir kez çözülür; sayfalar
 * `settings.homeRecentCount` gibi hazır değerleri okur, her yerde ayrı ayrı
 * dönüştürme yapılmaz.
 */
export function getSettings(): ResolvedSettings {
  const raw = getRawSettings();

  const level = (ANNOUNCEMENT_LEVELS as readonly string[]).includes(raw.announcement_level)
    ? (raw.announcement_level as AnnouncementLevel)
    : "uyari";

  const sort = (SORT_KEYS as readonly string[]).includes(raw.default_sort)
    ? (raw.default_sort as SortKey)
    : "tarih-yeni";

  const recent = Number(raw.home_recent_count);

  return {
    ...raw,
    // Duyuru yalnızca metni varsa VE açıksa görünür.
    announcementVisible: isTruthy(raw.announcement_active) && raw.announcement.trim().length > 0,
    announcementLevel: level,
    homeRecentCount: Number.isFinite(recent) ? Math.min(Math.max(Math.trunc(recent), 3), 24) : 6,
    pdfPreviewEnabled: isTruthy(raw.enable_pdf_preview),
    downloadCountVisible: isTruthy(raw.show_download_count),
    surveysSectionVisible: isTruthy(raw.show_surveys_section),
    qdmsSectionVisible: isTruthy(raw.show_qdms_section),
    defaultSort: sort,
  };
}

export function setSettings(values: Partial<Record<SettingKey, string>>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  db.transaction(() => {
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) stmt.run(key, value);
    }
  })();
}

/** Tüm ayarları varsayılanlara döndürür. */
export function resetSettings(): void {
  getDb().prepare(`DELETE FROM settings`).run();
}
