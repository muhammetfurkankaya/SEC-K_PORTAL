/**
 * Sekme çubuğunun önizlemesi — ayarlar ve Sekmeler ekranı ortak kullanır.
 *
 * Portaldaki SiteNav'ın görünümünü taklit eder: ilk sekme etkin (kırmızı
 * alt çizgi), diğerleri pasif. Punto/renk, hiza ve sayı seçimi anında yansır.
 */
export function NavPreview({
  labels,
  counts = [],
  showCounts = false,
  appearance,
  alignClass,
}: {
  labels: string[];
  /** Sekmelerin yanındaki sayılar, `labels` ile aynı sırada (yoksa boş). */
  counts?: (number | undefined)[];
  showCounts?: boolean;
  appearance: string;
  alignClass: string;
}) {
  return (
    <div className="border-b border-line bg-surface px-3">
      <div className={`flex gap-1 overflow-x-auto ${alignClass}`}>
        {labels.map((label, index) => (
          <span
            key={`${index}-${label}`}
            className={`shrink-0 border-b-[3px] px-3 py-3 whitespace-nowrap ${
              index === 0
                ? "border-tfs-red font-semibold text-ink"
                : "border-transparent text-ink-soft"
            }`}
          >
            <span className={`inline-flex items-center gap-2 ${appearance}`}>
              {label || "—"}
              {showCounts && (counts[index] ?? 0) > 0 ? (
                <span className="rounded-brand bg-white/20 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
                  {counts[index]}
                </span>
              ) : null}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
