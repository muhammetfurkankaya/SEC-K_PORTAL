/** Türkçe biçimlendirme yardımcıları. */

/**
 * 'YYYY-MM-DD' veya ISO tarih-saat metnini "12 Mart 2026" biçiminde verir.
 *
 * Tarih dizesini elle ayrıştırıyoruz: `new Date("2026-03-12")` UTC olarak
 * yorumlanır ve yerel saat dilimine göre bir gün kayabilir.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Tarih ve saati birlikte gösterir: "12 Mart 2026 14:05". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  // SQLite datetime('now') "YYYY-MM-DD HH:MM:SS" (UTC) döner; ISO'ya çeviriyoruz.
  const isoish = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const date = new Date(isoish);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Dosya boyutunu okunabilir hale getirir: "1,4 MB". */
export function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${units[unit]}`;
}

/** Sayıyı Türkçe binlik ayırıcı ile yazar. */
export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Yüzde değerini "%42,5" biçiminde verir. */
export function formatPercent(value: number, digits = 1): string {
  return `%${formatNumber(value, digits)}`;
}

/** Metinden URL için güvenli bir slug üretir (Türkçe harfler dahil). */
export function slugify(value: string): string {
  const map: Record<string, string> = {
    ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
    ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
  };
  return value
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
