import { getDb } from "@/lib/db";
import type { Category, CategoryWithCount } from "@/lib/types";

/** Navigasyon sekmeleri: yalnızca aktif kategoriler, sıra numarasına göre. */
export function listActiveCategories(): CategoryWithCount[] {
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM bulletins b
                WHERE b.category_id = c.id AND b.is_published = 1) AS bulletin_count
         FROM categories c
        WHERE c.is_active = 1
        ORDER BY c.sort_order, c.name COLLATE NOCASE`,
    )
    .all() as CategoryWithCount[];
}

/** Admin panelindeki kategori yönetimi: pasif olanlar da dahil. */
export function listAllCategories(): CategoryWithCount[] {
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM bulletins b WHERE b.category_id = c.id) AS bulletin_count
         FROM categories c
        ORDER BY c.sort_order, c.name COLLATE NOCASE`,
    )
    .all() as CategoryWithCount[];
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getDb()
    .prepare(`SELECT * FROM categories WHERE slug = ? AND is_active = 1`)
    .get(slug) as Category | undefined;
}

export function getCategoryById(id: number): Category | undefined {
  return getDb().prepare(`SELECT * FROM categories WHERE id = ?`).get(id) as
    | Category
    | undefined;
}

export function createCategory(input: {
  slug: string;
  name: string;
  description?: string | null;
}): number {
  const db = getDb();
  // Yeni sekme en sona eklenir.
  const next = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM categories`).get() as {
    n: number;
  };
  const result = db
    .prepare(
      `INSERT INTO categories (slug, name, description, sort_order)
       VALUES (?, ?, ?, ?)`,
    )
    .run(input.slug, input.name, input.description ?? null, next.n);
  return Number(result.lastInsertRowid);
}

export function updateCategory(
  id: number,
  input: { name: string; description?: string | null; is_active: boolean },
): void {
  getDb()
    .prepare(
      `UPDATE categories
          SET name = ?, description = ?, is_active = ?
        WHERE id = ?`,
    )
    .run(input.name, input.description ?? null, input.is_active ? 1 : 0, id);
}

/**
 * Kategoriyi listede bir yukarı/aşağı taşır.
 *
 * Komşu kategori ile sort_order değerlerini takas ederiz; böylece tüm
 * listeyi yeniden numaralandırmaya gerek kalmaz.
 */
export function moveCategory(id: number, direction: "up" | "down"): void {
  const db = getDb();
  db.transaction(() => {
    const current = db.prepare(`SELECT id, sort_order FROM categories WHERE id = ?`).get(id) as
      | { id: number; sort_order: number }
      | undefined;
    if (!current) return;

    const neighbour = db
      .prepare(
        direction === "up"
          ? `SELECT id, sort_order FROM categories
              WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1`
          : `SELECT id, sort_order FROM categories
              WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1`,
      )
      .get(current.sort_order) as { id: number; sort_order: number } | undefined;
    if (!neighbour) return;

    const update = db.prepare(`UPDATE categories SET sort_order = ? WHERE id = ?`);
    update.run(neighbour.sort_order, current.id);
    update.run(current.sort_order, neighbour.id);
  })();
}

/**
 * Kategoriyi siler. İçinde bülten varsa şemadaki ON DELETE RESTRICT
 * nedeniyle silinmez; çağıran tarafa bilgi döndürürüz.
 */
export function deleteCategory(id: number): { deleted: boolean; reason?: string } {
  const db = getDb();
  const count = db.prepare(`SELECT COUNT(*) AS n FROM bulletins WHERE category_id = ?`).get(id) as {
    n: number;
  };
  if (count.n > 0) {
    return {
      deleted: false,
      reason: `Bu sekmede ${count.n} bülten var. Önce bültenleri taşıyın veya silin.`,
    };
  }
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
  return { deleted: true };
}
