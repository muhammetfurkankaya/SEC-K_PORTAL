/**
 * Yönetici şifresini sıfırlar.
 *
 * Şifreler scrypt ile tek yönlü hashlenerek saklandığı için mevcut şifre
 * hiçbir yerden okunamaz — kaybolduğunda yenisini belirlemek gerekir. Bu
 * script yalnızca şifreyi değiştirir; bültenler, anketler ve ayarlar
 * olduğu gibi kalır.
 *
 * Kullanım:
 *   npm run sifre                       → admin için rastgele şifre üretir
 *   npm run sifre -- --kullanici=furkan → belirli bir kullanıcı
 *   npm run sifre -- --sifre=Deneme1234 → şifreyi kendiniz belirlersiniz
 *   npm run sifre -- --liste            → kullanıcıları listeler
 */
import crypto from "node:crypto";
import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";

/** --anahtar=değer biçimindeki argümanı okur. */
function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found?.slice(prefix.length).trim() || undefined;
}

type UserRow = { id: number; username: string; role: string; last_login_at: string | null };

function listUsers(): UserRow[] {
  return getDb()
    .prepare(`SELECT id, username, role, last_login_at FROM admin_users ORDER BY id`)
    .all() as UserRow[];
}

function printUsers(users: UserRow[]): void {
  console.log("Kayıtlı yönetici hesapları:");
  for (const user of users) {
    const last = user.last_login_at ? `son giriş ${user.last_login_at}` : "hiç giriş yapılmamış";
    console.log(`  · ${user.username}  (${user.role}, ${last})`);
  }
}

function main(): void {
  const db = getDb();
  const users = listUsers();

  if (users.length === 0) {
    console.log("Hiç yönetici hesabı yok. Önce `npm run seed` çalıştırın.");
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--liste")) {
    printUsers(users);
    console.log("");
    console.log("Belirli bir hesabı sıfırlamak için --kullanici=<ad> ekleyin.");
    return;
  }

  // Kullanıcı belirtilmediyse tek hesap varsa onu, çoksa "admin"i hedefle.
  const requested = arg("kullanici");
  const target = requested
    ? users.find((u) => u.username.toLocaleLowerCase("tr") === requested.toLocaleLowerCase("tr"))
    : users.find((u) => u.username === "admin") ?? (users.length === 1 ? users[0] : undefined);

  if (!target) {
    if (requested) {
      console.log(`"${requested}" adlı kullanıcı bulunamadı.`);
    } else {
      console.log("Birden fazla hesap var; hangisini sıfırlayacağınızı belirtin.");
    }
    console.log("");
    printUsers(users);
    console.log("");
    console.log("Kullanıcıyı --kullanici=<ad> ile belirtin.");
    process.exitCode = 1;
    return;
  }

  const provided = arg("sifre") ?? process.env.SECK_ADMIN_PASSWORD?.trim();

  if (provided && provided.length < 8) {
    console.log("Şifre en az 8 karakter olmalı.");
    process.exitCode = 1;
    return;
  }

  const password =
    provided || crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "");

  db.prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`)
    .run(hashPassword(password), target.id);

  console.log("");
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │  YENİ GİRİŞ BİLGİLERİ                       │");
  console.log("  ├─────────────────────────────────────────────┤");
  console.log(`  │  Kullanıcı adı : ${target.username.padEnd(26)} │`);
  console.log(`  │  Şifre         : ${password.padEnd(26)} │`);
  console.log("  └─────────────────────────────────────────────┘");
  console.log("");
  console.log("  Şifre değiştirildi. Bültenler, anketler ve ayarlar etkilenmedi.");
  console.log("  Bu şifreyi kaydedin — bir daha görüntülenemez.");
  console.log("");
}

main();
