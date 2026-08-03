import { getDb } from "@/lib/db";
import type { Bulletin, BulletinWithCategory } from "@/lib/types";

const WITH_CATEGORY = `
  SELECT b.*, c.name AS category_name, c.slug AS category_slug
    FROM bulletins b
    JOIN categories c ON c.id = b.category_id
`;

/** Bir sekmenin yayımlanmış bültenleri — en yeni önce. */
export function listBulletinsByCategory(categoryId: number): BulletinWithCategory[] {
  return getDb()
    .prepare(
      `${WITH_CATEGORY}
       WHERE b.category_id = ? AND b.is_published = 1
       ORDER BY b.published_date DESC, b.id DESC`,
    )
    .all(categoryId) as BulletinWithCategory[];
}

/** Ana sayfadaki "son yayımlananlar" bölümü. */
export function listRecentBulletins(limit = 6): BulletinWithCategory[] {
  return getDb()
    .prepare(
      `${WITH_CATEGORY}
       WHERE b.is_published = 1
       ORDER BY b.published_date DESC, b.id DESC
       LIMIT ?`,
    )
    .all(limit) as BulletinWithCategory[];
}

/**
 * Tüm sekmelerdeki yayımlanmış bültenler.
 *
 * Arama sayfası bunu kullanır: çalışan bültenin hangi bölümde olduğunu
 * bilmek zorunda kalmadan arayabilsin.
 */
export function listAllPublishedBulletins(): BulletinWithCategory[] {
  return getDb()
    .prepare(
      `${WITH_CATEGORY}
       WHERE b.is_published = 1 AND c.is_active = 1
       ORDER BY b.published_date DESC, b.id DESC`,
    )
    .all() as BulletinWithCategory[];
}

/** Admin listesi — yayından kaldırılmışlar da dahil. */
export function listAllBulletins(): BulletinWithCategory[] {
  return getDb()
    .prepare(`${WITH_CATEGORY} ORDER BY b.published_date DESC, b.id DESC`)
    .all() as BulletinWithCategory[];
}

export function getBulletin(id: number): BulletinWithCategory | undefined {
  return getDb().prepare(`${WITH_CATEGORY} WHERE b.id = ?`).get(id) as
    | BulletinWithCategory
    | undefined;
}

/** Yalnızca yayımlanmış bülteni verir — genel sayfalar bunu kullanır. */
export function getPublishedBulletin(id: number): BulletinWithCategory | undefined {
  return getDb()
    .prepare(`${WITH_CATEGORY} WHERE b.id = ? AND b.is_published = 1`)
    .get(id) as BulletinWithCategory | undefined;
}

export function createBulletin(input: {
  category_id: number;
  bulletin_no: string;
  subject: string;
  description?: string | null;
  published_date: string;
  file_name: string;
  file_path: string;
  file_size: number;
  is_published: boolean;
}): number {
  const result = getDb()
    .prepare(
      `INSERT INTO bulletins
         (category_id, bulletin_no, subject, description, published_date,
          file_name, file_path, file_size, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.category_id,
      input.bulletin_no,
      input.subject,
      input.description ?? null,
      input.published_date,
      input.file_name,
      input.file_path,
      input.file_size,
      input.is_published ? 1 : 0,
    );
  return Number(result.lastInsertRowid);
}

/** Üst verileri günceller; dosyanın kendisi değişmez. */
export function updateBulletinMeta(
  id: number,
  input: {
    category_id: number;
    bulletin_no: string;
    subject: string;
    description?: string | null;
    published_date: string;
    is_published: boolean;
  },
): void {
  getDb()
    .prepare(
      `UPDATE bulletins
          SET category_id = ?, bulletin_no = ?, subject = ?, description = ?,
              published_date = ?, is_published = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
    .run(
      input.category_id,
      input.bulletin_no,
      input.subject,
      input.description ?? null,
      input.published_date,
      input.is_published ? 1 : 0,
      id,
    );
}

/** Var olan bültenin PDF dosyasını değiştirir. */
export function replaceBulletinFile(
  id: number,
  file: { file_name: string; file_path: string; file_size: number },
): void {
  getDb()
    .prepare(
      `UPDATE bulletins
          SET file_name = ?, file_path = ?, file_size = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
    .run(file.file_name, file.file_path, file.file_size, id);
}

export function deleteBulletin(id: number): Bulletin | undefined {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM bulletins WHERE id = ?`).get(id) as Bulletin | undefined;
  if (row) db.prepare(`DELETE FROM bulletins WHERE id = ?`).run(id);
  // Diskteki dosyayı silmek çağıranın sorumluluğunda — dönen kayıt yolu içerir.
  return row;
}

/**
 * İndirme sayacını artırır.
 *
 * Karar vericiye hangi bültenin ne kadar okunduğunu gösterir. Sayaç
 * bilgilendirme amaçlıdır; hata vermesi dosya indirmeyi engellememeli.
 */
export function incrementDownloadCount(id: number): void {
  try {
    getDb()
      .prepare(`UPDATE bulletins SET download_count = download_count + 1 WHERE id = ?`)
      .run(id);
  } catch {
    // Sayaç kritik değil; sessizce geç.
  }
}

/** Aynı sekmede aynı bülten numarası var mı? (kendisi hariç) */
export function bulletinNoExists(
  categoryId: number,
  bulletinNo: string,
  exceptId?: number,
): boolean {
  const row = getDb()
    .prepare(
      `SELECT id FROM bulletins
        WHERE category_id = ? AND bulletin_no = ? AND id IS NOT ?`,
    )
    .get(categoryId, bulletinNo, exceptId ?? null);
  return Boolean(row);
}

export function countBulletins(): { total: number; published: number } {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(is_published), 0) AS published
         FROM bulletins`,
    )
    .get() as { total: number; published: number };
}
