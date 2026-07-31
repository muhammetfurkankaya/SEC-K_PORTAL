import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, DB_PATH, UPLOADS_DIR } from "@/lib/paths";

let instance: Database.Database | null = null;

/**
 * Paylaşılan SQLite bağlantısı.
 *
 * better-sqlite3 senkron çalışır ve ayrı bir veritabanı sunucusu gerektirmez;
 * şirket içi bir portalın yükü için fazlasıyla yeterlidir. Bağlantı ilk
 * çağrıda açılır, şema uygulanır ve süreç boyunca yeniden kullanılır.
 */
export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const db = new Database(DB_PATH);

  // WAL, okuma yoğun bir portalda eşzamanlı erişimi rahatlatır.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Yazma sırasında kilit varsa hata vermek yerine 5 sn bekle.
  db.pragma("busy_timeout = 5000");

  const schema = fs.readFileSync(
    path.join(process.cwd(), "lib", "db", "schema.sql"),
    "utf8",
  );
  db.exec(schema);

  instance = db;
  return db;
}

/**
 * Birden fazla yazma işlemini tek işlem (transaction) içinde çalıştırır.
 * Herhangi bir adım hata verirse tamamı geri alınır.
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const db = getDb();
  return db.transaction(() => fn(db))();
}

/** SQLite'ın 0/1 tamsayılarını boolean'a çevirir. */
export function toBool(value: unknown): boolean {
  return value === 1 || value === true;
}

/** Boolean'ı SQLite'ın beklediği 0/1 değerine çevirir. */
export function fromBool(value: boolean | undefined | null): 0 | 1 {
  return value ? 1 : 0;
}
