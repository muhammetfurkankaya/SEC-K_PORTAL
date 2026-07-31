import { formatNumber, formatPercent } from "@/lib/format";
import type { OptionTally } from "@/lib/analytics";

/**
 * Anket analiz grafikleri.
 *
 * Tasarım kararları:
 *
 * • **Renk işi.** Büyüklük karşılaştıran her grafik (seçenek dağılımları,
 *   histogramlar, departmanlar) tek hue kullanır — kurumsal kırmızı #CE2028.
 *   Kategorik palete ihtiyaç yok, çünkü karşılaştırılan şey kimlik değil
 *   büyüklük. Yalnızca NPS üç sıralı sınıf taşıdığı için diverging'dir:
 *   #CE2028 (köstekleyici) — #D6D1CA (nötr) — #9ED660 (destekleyici).
 *
 * • **Erişilebilirlik.** Marka paletinin açık tonları (#D6D1CA, #9ED660) beyaz
 *   zeminde 3:1 kontrastın altında kalıyor. Palet kurumsal kimlikle sabit
 *   olduğu için rengi değiştirmek yerine öngörülen telafiyi uyguluyoruz:
 *   her segmentin sayısı ve yüzdesi **doğrudan yazılır**, üç sınıf ayrıca
 *   metin etiketiyle adlandırılır ve tüm değerler tablo olarak da verilir.
 *   Böylece hiçbir bilgi yalnızca renge bağlı kalmaz.
 *
 * • **Grafikler saf HTML/CSS.** Sunucuda render edilir; JavaScript
 *   gerektirmez, yazdırmada bozulmaz.
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
            <span className="min-w-0 text-sm text-tfs-dark">{item.label}</span>
            {/* Doğrudan etiket: değer hiçbir zaman yalnızca renkte değil. */}
            <span className="shrink-0 text-xs whitespace-nowrap text-tfs-dark-60">
              <span className="font-semibold text-tfs-dark">{formatNumber(item.count)}</span>{" "}
              · {formatPercent(item.percent)}
            </span>
          </div>

          {/* Çubuk: ≤24px kalınlık, veri ucu 4px yuvarlatılmış, tabanda kare. */}
          <div className="mt-1 h-2.5 w-full bg-tfs-grey-40">
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
            <span className="mb-1 text-center text-[0.625rem] font-semibold text-tfs-dark">
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
      <div className="mt-1 flex gap-0.5 border-t border-tfs-grey pt-1">
        {items.map((item) => (
          <span
            key={item.label}
            className="min-w-0 flex-1 text-center text-[0.625rem] text-tfs-dark-60"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * NPS diverging çubuğu ve skoru.
 *
 * Üç sıralı sınıfı tek bir yığın çubukta gösterir; nötr grup ortada gri
 * kalır. Her sınıf hem renkle hem adı ve sayısıyla verilir.
 */
export function NpsChart({
  score,
  promoters,
  passives,
  detractors,
}: {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
}) {
  const total = promoters + passives + detractors;

  if (total === 0) return <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>;

  const segments = [
    { label: "Köstekleyici", hint: "0–6 puan", count: detractors, color: "bg-tfs-red" },
    { label: "Nötr", hint: "7–8 puan", count: passives, color: "bg-tfs-grey" },
    { label: "Destekleyici", hint: "9–10 puan", count: promoters, color: "bg-tfs-green" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-tfs-dark-60 uppercase">
            NPS Skoru
          </p>
          {/* Hero sayı: panonun okunacak ilk değeri. */}
          <p className="text-4xl leading-none font-semibold text-tfs-dark">
            {score > 0 ? "+" : ""}
            {formatNumber(score, 0)}
          </p>
          <p className="mt-1 text-[0.6875rem] font-light text-tfs-dark-60">
            −100 ile +100 arası · {formatNumber(total)} cevap
          </p>
        </div>

        <p className="max-w-xs text-xs font-light text-tfs-dark-80">
          Skor, destekleyicilerin yüzdesinden köstekleyicilerin yüzdesi çıkarılarak
          hesaplanır. Sıfırın üstü olumlu kabul edilir.
        </p>
      </div>

      {/* Yığın çubuk — segmentler arasında 2px yüzey boşluğu */}
      <div className="mt-4 flex h-6 w-full gap-0.5 overflow-hidden">
        {segments.map((segment) =>
          segment.count > 0 ? (
            <div
              key={segment.label}
              className={`flex items-center justify-center ${segment.color}`}
              style={{ width: `${(segment.count / total) * 100}%` }}
              title={`${segment.label} (${segment.hint}): ${formatNumber(segment.count)}`}
            >
              {/* Etiket yalnızca sığdığında içeride yazılır. */}
              {segment.count / total > 0.12 ? (
                <span
                  className={`text-[0.625rem] font-semibold ${
                    segment.color === "bg-tfs-red" ? "text-white" : "text-tfs-dark"
                  }`}
                >
                  {formatNumber(segment.count)}
                </span>
              ) : null}
            </div>
          ) : null,
        )}
      </div>

      {/* Açıklama (legend) — üç sınıf olduğu için zorunlu */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs">
            <span aria-hidden="true" className={`block size-2.5 shrink-0 ${segment.color}`} />
            <span className="text-tfs-dark">{segment.label}</span>
            <span className="text-tfs-dark-60">
              {segment.hint} · <span className="font-semibold text-tfs-dark">
                {formatNumber(segment.count)}
              </span>{" "}
              ({formatPercent((segment.count / total) * 100)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sayısal özet — grafik değil, değer kutuları. */
export function NumericStats({
  stats,
  unit = "",
}: {
  stats: { count: number; mean: number; median: number; min: number; max: number; stdDev: number };
  unit?: string;
}) {
  if (stats.count === 0) return <EmptyNote>Bu soruya cevap gelmemiş.</EmptyNote>;

  // Birim yalnızca ölçek üzerindeki değerlere yazılır; "48 / 5 cevap" gibi
  // anlamsız bir okuma oluşmasın diye adet ve sapma birimsiz kalır.
  const cells = [
    { label: "Ortalama", value: formatNumber(stats.mean, 2), withUnit: true },
    { label: "Ortanca", value: formatNumber(stats.median, 2), withUnit: true },
    { label: "En düşük", value: formatNumber(stats.min, 2), withUnit: false },
    { label: "En yüksek", value: formatNumber(stats.max, 2), withUnit: false },
    { label: "Std. sapma", value: formatNumber(stats.stdDev, 2), withUnit: false },
    { label: "Cevap", value: formatNumber(stats.count), withUnit: false },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cells.map((cell) => (
        <div key={cell.label}>
          <dt className="text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
            {cell.label}
          </dt>
          <dd className="mt-0.5 text-lg font-semibold text-tfs-dark">
            {cell.value}
            {unit && cell.withUnit ? (
              <span className="ml-0.5 text-xs font-normal text-tfs-dark-60">{unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-3 py-6 text-center text-xs font-light text-tfs-dark-60">
      {children}
    </p>
  );
}
