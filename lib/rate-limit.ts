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
 * Bellekte tutulacak en fazla kova sayısı.
 *
 * Anahtarlar istemciden gelen değerleri (IP, kullanıcı adı) içerdiği için
 * saldırgan her denemede farklı bir anahtar üretebilir. Süresi geçmiş kovalar
 * temizlenmezse harita sınırsız büyür ve süreç bellekte şişer.
 */
const MAX_BUCKETS = 10_000;

/** Süresi geçmiş kovaları atar; hâlâ doluysa en eski kovaları da temizler. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size < MAX_BUCKETS) return;

  // Hepsi hâlâ geçerliyse en erken sıfırlanacakları at: en fazla bekleyen
  // (yani en yeni) kovaları korumak hız sınırını daha uzun süre ayakta tutar.
  const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  for (const [key] of sorted.slice(0, Math.ceil(buckets.size / 4))) {
    buckets.delete(key);
  }
}

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
    // Yeni kova açmadan önce ölü kovaları temizle.
    if (buckets.size >= MAX_BUCKETS) sweep(now);
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
