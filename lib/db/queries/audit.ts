import { getDb } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

export type AuditEntry = {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  at: string;
};

/**
 * Admin panelindeki değişiklikleri kaydeder.
 *
 * Kayıt tutmak yardımcı bir işlevdir; başarısız olması ana işlemi
 * (bülten yükleme, anket yayınlama) engellememeli.
 */
export function logAction(
  user: SessionUser | null,
  action: string,
  options: { entity?: string; entityId?: string | number; detail?: string } = {},
): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_log (user_id, username, action, entity, entity_id, detail)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user?.id ?? null,
        user?.username ?? null,
        action,
        options.entity ?? null,
        options.entityId !== undefined ? String(options.entityId) : null,
        options.detail ?? null,
      );
  } catch {
    // Denetim kaydı kritik değil.
  }
}

export function listRecentAudit(limit = 20): AuditEntry[] {
  return getDb()
    .prepare(`SELECT * FROM audit_log ORDER BY at DESC, id DESC LIMIT ?`)
    .all(limit) as AuditEntry[];
}
