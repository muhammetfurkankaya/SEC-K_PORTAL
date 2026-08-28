import crypto from "node:crypto";

/**
 * Şifre karma işlemleri.
 *
 * Bu modül bilinçli olarak Next.js'ten bağımsızdır: `npm run seed` gibi düz
 * Node script'leri de buradan import eder (lib/auth.ts ise `next/headers`
 * kullandığı için yalnızca istek bağlamında çalışabilir).
 */

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

/**
 * İlk kurulumda atanan varsayılan yönetici şifresi.
 *
 * Sabit olması kasıtlı: kurulumu yapan kişi terminal çıktısını kaçırsa bile
 * panele girebilsin diye. Buna karşılık bu şifre bu depoda ve kurulum
 * belgelerinde açıkça yazılı — yani **ilk girişten sonra Ayarlar'dan
 * değiştirilmesi gerekir.** Değiştirilmediği sürece yönetim panelinde uyarı
 * gösterilir (bkz. isDefaultPassword).
 *
 * Farklı bir şifreyle kurmak için SECK_ADMIN_PASSWORD ortam değişkenini
 * verin; seed script'i onu kullanır.
 */
export const DEFAULT_ADMIN_PASSWORD = "Tfs2026...";

/**
 * Şifreyi scrypt ile hashler.
 *
 * node:crypto kullanmak bcrypt gibi ek bir native bağımlılıktan kaçınmamızı
 * sağlıyor. Sonuç "scrypt$N$r$p$tuz$karma" biçiminde tek metin olarak saklanır.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return [
    "scrypt",
    SCRYPT_OPTS.N,
    SCRYPT_OPTS.r,
    SCRYPT_OPTS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Şifreyi saklanan karma ile karşılaştırır (sabit zamanlı). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let derived: Buffer;
  try {
    derived = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
  } catch {
    return false;
  }

  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/**
 * Hesap hâlâ varsayılan şifreyi mi kullanıyor?
 *
 * Şifreler tek yönlü saklandığı için "değiştirilmiş mi" sorusunun tek cevabı
 * varsayılanı deneyip bakmaktır.
 */
export function isDefaultPassword(storedHash: string): boolean {
  return verifyPassword(DEFAULT_ADMIN_PASSWORD, storedHash);
}
