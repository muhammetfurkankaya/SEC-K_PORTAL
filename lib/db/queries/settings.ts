import { cache } from "react";
import { getDb } from "@/lib/db";
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  type PortalSettings,
  type ResolvedSettings,
  type SettingKey,
} from "@/lib/settings-schema";
import { resolveSettings } from "@/lib/settings-validate";

/**
 * Portal ayarlarının okunması ve yazılması.
 *
 * Anahtar listesi ve seçenekler lib/settings-schema.ts, tür çözümlemesi
 * lib/settings-validate.ts içinde. Burada yalnızca veritabanı erişimi var.
 */

/**
 * Ham ayar değerleri — kaydedilmemiş olanlar için varsayılanla birlikte.
 *
 * React `cache()`: üst bant, alt bilgi ve sayfanın kendisi aynı istekte
 * ayarları ayrı ayrı okuyor. ~70 anahtarla her istekte 5-6 kez tüm tabloyu
 * taramanın anlamı yok; istek boyunca tek okuma yeterli.
 */
export const getRawSettings = cache(function getRawSettings(): PortalSettings {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...SETTING_DEFAULTS } as PortalSettings;

  for (const key of SETTING_KEYS) {
    const value = stored.get(key);
    if (value !== undefined) result[key] = value;
  }
  return result;
});

/**
 * Arayüzün kullandığı ayarlar.
 *
 * Her alan türüne çevrilmiş olarak gelir: boolean boolean, sayı sayı, enum
 * dar birleşim. Bozuk ya da eski bir değer arayüze sızmaz, varsayılana
 * düşer. `announcementVisible` tek anahtardan türetilemediği için burada.
 */
export const getSettings = cache(function getSettings(): ResolvedSettings {
  const raw = getRawSettings();
  const typed = resolveSettings(raw);

  return {
    ...typed,
    // Duyuru yalnızca metni varsa VE açıksa görünür.
    announcementVisible: typed.announcement_active && typed.announcement.trim().length > 0,

    // Eski adlar — çağrı yerleri kademeli olarak doğrudan anahtara geçecek.
    announcementLevel: typed.announcement_level,
    homeRecentCount: typed.home_recent_count,
    pdfPreviewEnabled: typed.enable_pdf_preview,
    downloadCountVisible: typed.show_download_count,
    surveysSectionVisible: typed.show_surveys_section,
    defaultSort: typed.default_sort,
  };
});

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
