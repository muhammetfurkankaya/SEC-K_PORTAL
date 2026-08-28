/**
 * İstek başlıklarından gerçek istemci adresini çıkarır.
 *
 * Next, ters vekil arkasında olmasa bile `x-forwarded-for` başlığını bağlantı
 * soketinden kendisi üretir. IIS + ARR ya da HttpPlatformHandler arkasında
 * portala gelen bağlantı 127.0.0.1'den geldiği için bu başlık **her ziyaretçi
 * için aynı** değeri taşır. Bu değeri istemci adresi sayarsak:
 *
 *   - anket hız sınırı tüm şirket için tek bir kovaya düşer,
 *   - "tek kez doldurulabilir" ankette ilk gönderim diğer herkesi engeller.
 *
 * Bu yüzden vekilin kendi adresleri istemci adresi olarak kabul edilmez;
 * böyle bir durumda çağıran taraf cihaz çerezine düşer.
 */

/** Vekilin/sunucunun kendi adresleri — istemciyi tanımlamak için kullanılamaz. */
const PROXY_LOCAL = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "0.0.0.0",
  "::",
  "localhost",
  "unknown",
]);

/**
 * `x-forwarded-for` (soldan sağa: istemci, vekil…) ve `x-real-ip`
 * başlıklarından ilk anlamlı adresi seçer; bulunamazsa null döner.
 */
export function pickClientIp(
  forwardedFor: string | null | undefined,
  realIp?: string | null,
): string | null {
  const candidates = [...(forwardedFor ?? "").split(","), realIp ?? ""];

  for (const raw of candidates) {
    const value = normalizeAddress(raw);
    if (value && !PROXY_LOCAL.has(value)) return value;
  }
  return null;
}

/** Adresi karşılaştırılabilir hâle getirir: boşluk, port ve köşeli parantez. */
function normalizeAddress(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  // IIS "includePortInXForwardedFor" ile portu da ekleyebiliyor: 10.0.0.5:51234
  // IPv6 adresleri köşeli parantez içinde gelir: [::1]:51234
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close > 0) value = value.slice(1, close);
  } else {
    const colons = value.split(":").length - 1;
    if (colons === 1) value = value.split(":")[0];
  }

  return value || null;
}
