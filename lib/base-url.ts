import { headers } from "next/headers";

/**
 * Portalın dışarıdan erişilen kök adresini bulur.
 *
 * QR kodların içine gömülecek adres mutlak olmak zorundadır. Sunucu adı
 * kuruluma göre değiştiği için (localhost:3000, seck.turkishfuel.com …)
 * isteğin başlıklarından okuyoruz. Ters vekil arkasında çalışırken
 * SECK_BASE_URL ortam değişkeni ile sabitlenebilir.
 */
export async function getBaseUrl(): Promise<string> {
  const fromEnv = process.env.SECK_BASE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3000";
  const proto = store.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "http");

  return `${proto}://${host}`;
}

/** Bir anketin QR kodunda kullanılacak tam adresi verir. */
export async function surveyUrl(token: string): Promise<string> {
  return `${await getBaseUrl()}/anket/${token}`;
}
