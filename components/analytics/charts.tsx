import { formatNumber, formatPercent } from "@/lib/format";
import type { OptionTally } from "@/lib/analytics";

/**
 * Anket analiz grafikleri.
 *
 * Tasarım kararları:
 *
 * • **Tek hue.** Her grafik büyüklük karşılaştırır (seçenek dağılımları,
 *   histogramlar, departmanlar), kimlik değil — bu yüzden hepsi tek renk
 *   kullanır: kurumsal kırmızı #CE2028. Kategorik palete gerek yok, birden
 *   fazla renk burada bilgi taşımaz yalnızca gürültü ekler.
 *
 * • **Değerler her zaman yazılı.** Sayı ve yüzde çubuğun yanında yazar;
 *   hiçbir bilgi yalnızca renge veya çubuk boyuna bağlı kalmaz. #CE2028
 *   beyaz zeminde kontrast eşiğini geçtiği için ek bir telafi gerekmez.
 *
 * • **Saf HTML/CSS.** Sunucuda render edilir; JavaScript gerektirmez,
 *   yazdırmada bozulmaz.
 */

const BAR_HUE = "bg-tfs-red";

/**
 * Yatay çubuklu dağılım.
 *
 * Seçimli sorular, evet/hayır ve departman kırılımı için kullanılır.
 * En yüksek değer ölçeği belirler; böylece küçük farklar görünür kalır.
 */
export function BarTally({
  items,
  emptyNote = "Bu soruya cevap gelmemiş.",
}: {
  items: OptionTally[];
  emptyNote?: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  if (items.length === 0 || items.every((item) => item.count === 0)) {
    return <EmptyNote>{emptyNote}</EmptyNote>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-sm text-ink">{item.label}</span>
            {/* Doğrudan etiket: değer hiçbir zaman yalnızca renkte değil. */}
            <span className="shrink-0 text-xs whitespace-nowrap text-ink-faint">
              <span className="font-semibold text-ink">{formatNumber(item.count)}</span> ·{" "}
              {formatPercent(item.percent)}
            </span>
          </div>

          {/* Çubuk: ≤24px kalınlık, veri ucu 4px yuvarlatılmış, tabanda kare. */}
          <div className="mt-1 h-2.5 w-full bg-surface-3">
            <div
              className={`h-full rounded-r-[4px] ${BAR_HUE}`}
              style={{ width: `${(item.count / max) * 100}%` }}
              role="presentation"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sütunlu histogram — puanlama (1–5) ve NPS (0–10) dağılımı için.
 *
 * Ölçek değerleri sıralı olduğundan sütun biçimi doğru okumayı verir:
 * soldan sağa artan puan.
 */
export function Histogram({ items }: { items: OptionTally[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  if (items.every((item) => item.count === 0)) {
    return <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>;
  }

  return (
    <div>
      {/* Sütunlar arasında 2px yüzey boşluğu (gap-0.5) ayırıcı görevi görür.
          Sütunlar `items-stretch` ile tam yükseklik alır; çubuğun yüzde
          yüksekliği ancak böyle belirli bir yüksekliğe göre çözülür. */}
      <div className="flex h-32 items-stretch gap-0.5">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-[0.625rem] font-semibold text-ink">
              {item.count > 0 ? formatNumber(item.count) : ""}
            </span>
            <div
              className={`w-full shrink-0 rounded-t-[4px] ${BAR_HUE}`}
              style={{ height: `${Math.max((item.count / max) * 100, item.count > 0 ? 3 : 0)}%` }}
              role="presentation"
              title={`${item.label} puan: ${formatNumber(item.count)} kişi (${formatPercent(
                item.percent,
              )})`}
            />
          </div>
        ))}
      </div>

      {/* Eksen etiketleri */}
      <div className="mt-1 flex gap-0.5 border-t border-line pt-1">
        {items.map((item) => (
          <span
            key={item.label}
            className="min-w-0 flex-1 text-center text-[0.625rem] text-ink-faint"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Puanlama özeti — ortalamayı öne çıkarır, gerisini yanına yazar.
 *
 * Karar verici için okunması gereken tek sayı ortalamadır; ortanca ve cevap
 * sayısı bağlamı verir. Min/maks ve standart sapma bilinçli olarak
 * çıkarıldı: dağılım histogramı aynı bilgiyi zaten gösteriyor.
 */
export function ScoreSummary({
  stats,
  unit = "",
}: {
  stats: { count: number; mean: number; median: number };
  unit?: string;
}) {
  if (stats.count === 0) return <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>;

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
      <div>
        <p className="text-[0.625rem] font-semibold tracking-[0.1em] text-ink-faint uppercase">
          Ortalama
        </p>
        <p className="tnum text-3xl leading-none font-semibold text-ink">
          {formatNumber(stats.mean, 2)}
          {unit ? <span className="ml-1 text-sm font-light text-ink-faint">{unit}</span> : null}
        </p>
      </div>

      <div className="flex gap-6">
        <span>
          <span className="block text-[0.625rem] font-semibold tracking-[0.1em] text-ink-faint uppercase">
            Ortanca
          </span>
          <span className="tnum text-base font-semibold text-ink">
            {formatNumber(stats.median, 2)}
          </span>
        </span>
        <span>
          <span className="block text-[0.625rem] font-semibold tracking-[0.1em] text-ink-faint uppercase">
            Cevap
          </span>
          <span className="tnum text-base font-semibold text-ink">{formatNumber(stats.count)}</span>
        </span>
      </div>
    </div>
  );
}

/** Sayı sorusu özeti — ölçek olmadığı için aralık da gösterilir. */
export function NumberSummary({
  stats,
}: {
  stats: { count: number; mean: number; median: number; min: number; max: number };
}) {
  if (stats.count === 0) return <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>;

  const cells = [
    { label: "Ortalama", value: formatNumber(stats.mean, 2) },
    { label: "Ortanca", value: formatNumber(stats.median, 2) },
    { label: "Aralık", value: `${formatNumber(stats.min, 0)} – ${formatNumber(stats.max, 0)}` },
    { label: "Cevap", value: formatNumber(stats.count) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label}>
          <dt className="text-[0.625rem] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            {cell.label}
          </dt>
          <dd className="tnum mt-0.5 text-lg font-semibold text-ink">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-brand border border-dashed border-line bg-surface-2 px-3 py-6 text-center text-xs font-light text-ink-faint">
      {children}
    </p>
  );
}
