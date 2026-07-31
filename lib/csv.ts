/**
 * CSV üretimi.
 *
 * Excel'in Türkçe kurulumları için iki ayrıntı önemlidir:
 *  • Dosya başına BOM eklenir; aksi halde ş/ğ/İ gibi karakterler bozuk görünür.
 *  • Alan ayırıcı noktalı virgüldür; Türkçe Excel virgülü ondalık ayırıcı
 *    kabul ettiği için virgüllü CSV tek kolona düşer.
 */
const SEPARATOR = ";";
const BOM = "﻿";

/** Bir hücreyi CSV kurallarına göre kaçırır. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // Satır sonlarını koru ama hücreyi tırnak içine al.
  const needsQuotes =
    text.includes(SEPARATOR) || text.includes('"') || text.includes("\n") || text.includes("\r");

  if (needsQuotes) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Satır dizisinden tam bir CSV metni üretir. */
export function toCsv(rows: unknown[][]): string {
  return BOM + rows.map((row) => row.map(escapeCell).join(SEPARATOR)).join("\r\n") + "\r\n";
}

/** Sayıyı Türkçe ondalık ayırıcı (virgül) ile yazar — Excel doğru okusun. */
export function csvNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}
