import { getDb } from "@/lib/db";

/**
 * Portal ayarları.
 *
 * QDMS adresleri kodda sabit değildir: QDMS'in Öneri ve Olay bildirimi için
 * ayrı derin linkleri varsa admin panelinden girilebilir.
 */
export const SETTING_DEFAULTS = {
  portal_title: "SEÇ-K Portalı",
  portal_subtitle: "Sağlık, Emniyet, Çevre ve Kalite",
  qdms_suggestion_url: "https://tqdms.turkishfuel.com/QDMS/QDMSNET/BSAT/Default.aspx",
  qdms_incident_url: "https://tqdms.turkishfuel.com/QDMS/QDMSNET/BSAT/Default.aspx",
  announcement: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

/** Tüm ayarları, kaydedilmemiş olanlar için varsayılanla birlikte verir. */
export function getSettings(): Record<SettingKey, string> {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;

  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    const value = stored.get(key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export function getSetting(key: SettingKey): string {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? SETTING_DEFAULTS[key];
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
