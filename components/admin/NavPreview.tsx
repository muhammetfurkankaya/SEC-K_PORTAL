/**
 * Sekme çubuğunun önizlemesi — ayarlar ve Sekmeler ekranı ortak kullanır.
 *
 * Portaldaki SiteNav'ın görünümünü taklit eder: ilk sekme etkin (kırmızı
 * alt çizgi), diğerleri pasif. Punto/renk ve hiza seçimi anında yansır.
 */
export function NavPreview({
  labels,
  appearance,
  alignClass,
}: {
  labels: string[];
  appearance: string;
  alignClass: string;
}) {
  return (
    <div className="border-b border-tfs-grey bg-white px-3">
      <div className={`flex gap-1 overflow-x-auto ${alignClass}`}>
        {labels.map((label, index) => (
          <span
            key={`${index}-${label}`}
            className={`shrink-0 border-b-[3px] px-3 py-3 whitespace-nowrap ${
              index === 0
                ? "border-tfs-red font-semibold text-tfs-dark"
                : "border-transparent text-tfs-dark-80"
            }`}
          >
            <span className={appearance}>{label || "—"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
