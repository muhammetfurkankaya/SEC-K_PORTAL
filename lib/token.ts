import crypto from "node:crypto";

/**
 * Anketlerin genel adresinde kullanılan rastgele belirteç.
 *
 * QR kodu okutan herkes anketi doldurabildiği için belirtecin tahmin
 * edilemez olması gerekir; artımlı bir kimlik (1, 2, 3…) kullanılsa
 * yayınlanmamış anketler denenerek bulunabilirdi.
 */
export function generateToken(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Yüklenen dosyalar için çakışmayan bir ad üretir. */
export function generateFileId(): string {
  return crypto.randomUUID();
}
