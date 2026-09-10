/**
 * İlk kurulum: bülten sekmelerini ve ilk admin kullanıcısını oluşturur.
 *
 * Kullanım:  npm run seed        (pakette: nodejs.cmd komutlar\seed.cjs)
 *
 * Birden fazla kez çalıştırılabilir; var olan kayıtlar korunur.
 *
 * Not: Portal ilk açılışta bu işi kendisi de yapıyor (lib/bootstrap.ts).
 * Bu script yalnızca kurulumu elle tetiklemek ve giriş bilgilerini ekrana
 * yazdırmak için var — sunucuda komut çalıştıramadığınız durumlarda
 * çağırmanız gerekmez.
 */
import { bootstrap } from "../lib/bootstrap";
import { DEFAULT_ADMIN_PASSWORD } from "../lib/password";

function main(): void {
  console.log("SEÇ-K Portal — ilk kurulum");
  console.log("");

  const result = bootstrap();
  console.log("Veritabanı hazır.");

  console.log("Sekmeler:");
  if (result.createdCategories.length === 0) {
    console.log("  · sekmeler zaten mevcut, değişiklik yapılmadı");
  } else {
    for (const name of result.createdCategories) {
      console.log(`  + sekme oluşturuldu: ${name}`);
    }
  }

  console.log("Admin kullanıcısı:");

  if (!result.createdAdmin) {
    console.log("  · admin kullanıcısı zaten mevcut, şifre değiştirilmedi");
  } else {
    const username = result.adminUsername ?? "admin";
    const password = result.adminPassword ?? DEFAULT_ADMIN_PASSWORD;
    const isDefault = password === DEFAULT_ADMIN_PASSWORD;

    console.log("");
    console.log("  ┌─────────────────────────────────────────────┐");
    console.log("  │  ADMIN GİRİŞ BİLGİLERİ                      │");
    console.log("  ├─────────────────────────────────────────────┤");
    console.log(`  │  Kullanıcı adı : ${username.padEnd(26)} │`);
    console.log(`  │  Şifre         : ${password.padEnd(26)} │`);
    console.log("  └─────────────────────────────────────────────┘");
    if (isDefault) {
      console.log("  Bu varsayılan şifredir ve kurulum belgelerinde yazılıdır.");
      console.log("  İLK GİRİŞTEN SONRA Ayarlar > Şifre değiştir ile değiştirin.");
      console.log("  Değiştirilene kadar yönetim panelinde uyarı görünür.");
    } else {
      console.log("  Bu şifreyi kaydedin — bir daha görüntülenemez.");
    }
    console.log("");
  }

  console.log("Kurulum tamamlandı.");
}

main();
