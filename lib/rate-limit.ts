/**
 * Basit, süreç içi hız sınırlayıcı.
 *
 * Portal tek bir Node süreci olarak çalıştığı için bellekte tutulan bir
 * sayaç yeterlidir; ayrıca Redis gibi bir bağımlılık gerektirmez. Sunucu
 * yeniden başladığında sayaçlar sıfırlanır — kaba kuvvet denemelerini
 * yavaşlatmak için bu kabul edilebilir.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * @param key      Sınırlanacak anahtar (ör. "giris:admin").
 * @param limit    Pencere içinde izin verilen deneme sayısı.
 * @param windowMs Pencere uzunluğu (milisaniye).
 * @returns İzin veriliyorsa allowed=true; aksi halde kalan bekleme süresi.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Başarılı işlemden sonra sayacı sıfırlar. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
