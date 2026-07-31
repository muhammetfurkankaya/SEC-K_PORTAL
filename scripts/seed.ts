/**
 * İlk kurulum: bülten sekmelerini ve ilk admin kullanıcısını oluşturur.
 *
 * Kullanım:  npm run seed
 *
 * Birden fazla kez çalıştırılabilir; var olan kayıtlar korunur. Admin şifresi
 * SECK_ADMIN_PASSWORD ortam değişkeni ile verilebilir, verilmezse rastgele
 * üretilip terminale yazdırılır.
 */
import crypto from "node:crypto";
import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";
import { createUser, countUsers, getUserByUsername } from "../lib/db/queries/users";
import { createCategory, getCategoryBySlug } from "../lib/db/queries/categories";

// Kullanıcının belirttiği başlangıç sekmeleri. Yeni sekmeler admin
// panelinden eklenebilir; burada yalnızca ilk kurulum listesi var.
const CATEGORIES = [
  { slug: "sec-k", name: "SEÇ-K Bültenleri", description: "Sağlık, Emniyet, Çevre ve Kalite bültenleri" },
  { slug: "sms", name: "SMS Bültenleri", description: "Emniyet Yönetim Sistemi (SMS) bültenleri" },
  { slug: "iga", name: "İGA Bültenleri", description: "İGA İstanbul Havalimanı bültenleri" },
  { slug: "thy", name: "THY Bültenleri", description: "Türk Hava Yolları bültenleri" },
];

function seedCategories(): void {
  let created = 0;
  for (const category of CATEGORIES) {
    if (getCategoryBySlug(category.slug)) continue;
    createCategory(category);
    created += 1;
    console.log(`  + sekme oluşturuldu: ${category.name}`);
  }
  if (created === 0) console.log("  · sekmeler zaten mevcut, değişiklik yapılmadı");
}

function seedAdmin(): void {
  const username = process.env.SECK_ADMIN_USERNAME?.trim() || "admin";

  if (getUserByUsername(username)) {
    console.log(`  · "${username}" kullanıcısı zaten mevcut, şifre değiştirilmedi`);
    return;
  }
  if (countUsers() > 0) {
    console.log("  · admin kullanıcısı zaten var, yeni kullanıcı oluşturulmadı");
    return;
  }

  // Rastgele ama okunabilir bir başlangıç şifresi.
  const password =
    process.env.SECK_ADMIN_PASSWORD?.trim() ||
    crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "");

  createUser({
    username,
    password_hash: hashPassword(password),
    full_name: "Portal Yöneticisi",
  });

  console.log("");
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │  ADMIN GİRİŞ BİLGİLERİ                      │");
  console.log("  ├─────────────────────────────────────────────┤");
  console.log(`  │  Kullanıcı adı : ${username.padEnd(26)} │`);
  console.log(`  │  Şifre         : ${password.padEnd(26)} │`);
  console.log("  └─────────────────────────────────────────────┘");
  console.log("  Bu şifreyi kaydedin ve ilk girişten sonra Ayarlar'dan değiştirin.");
  console.log("");
}

function main(): void {
  console.log("SEÇ-K Portal — ilk kurulum");
  console.log("");

  // getDb() şemayı da uygular.
  getDb();
  console.log("Veritabanı hazır.");

  console.log("Sekmeler:");
  seedCategories();

  console.log("Admin kullanıcısı:");
  seedAdmin();

  console.log("Kurulum tamamlandı. `npm run dev` ile başlatabilirsiniz.");
}

main();
