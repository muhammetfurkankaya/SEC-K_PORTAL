import path from "node:path";

/**
 * Çalışma zamanı verilerinin kök dizini.
 *
 * Veritabanı ve yüklenen bültenler burada tutulur. `public/` dışında olması
 * kasıtlıdır: dosyalara yalnızca /api/dosya/[id] üzerinden erişilir, böylece
 * indirme adı düzgün verilir ve dizin listeleme sızmaz.
 *
 * Sunucuda farklı bir konum (ör. yedeklenen bir disk) kullanmak için
 * SECK_DATA_DIR ortam değişkenini ayarlamak yeterlidir.
 */
export const DATA_DIR = process.env.SECK_DATA_DIR
  ? path.resolve(process.env.SECK_DATA_DIR)
  : path.join(process.cwd(), "data");

export const DB_PATH = path.join(DATA_DIR, "portal.db");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

/** Yüklenen bir bültenin diskteki tam yolunu verir. */
export function uploadPath(relativePath: string): string {
  return path.join(UPLOADS_DIR, relativePath);
}
