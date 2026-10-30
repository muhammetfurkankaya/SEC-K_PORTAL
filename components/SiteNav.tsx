"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPhotoRoute } from "@/lib/routes";

export type NavItem = { href: string; label: string; count?: number };

/**
 * Portal sekmeleri.
 *
 * Aktif sekme kılavuzun vurgu rengiyle (#CE2028) alt çizgi alır. Sekme
 * listesi veritabanından geldiği için burada sabit bir liste yoktur.
 *
 * Fotoğraflı sayfalarda (ana sayfa, bülten sekmeleri) sekmeler fotoğrafın
 * üzerinde saydam durur (HeaderFrame); o durumda yazılar beyaz.
 *
 * Renk: ayarlardan bir renk seçilmişse o renk etkin/pasif durum renklerinin
 * YERİNE kullanılır. İkisi aynı elemana birlikte verildiğinde CSS sırasında
 * durum rengi kazanıyor ve seçim hiç görünmüyordu. Etkin sekme bu durumda da
 * kalın yazı ve kırmızı alt çizgiyle ayrışır.
 */
export function SiteNav({
  items,
  sizeClass = "text-sm",
  colorClass = "",
  colorClassOnDark = "",
  alignClass = "justify-start",
}: {
  items: NavItem[];
  /** Ayarlardan gelen punto sınıfı. */
  sizeClass?: string;
  /** Ayarlardan gelen renk; "Varsayılan" ise boş. */
  colorClass?: string;
  /** Aynı rengin koyu zemin (fotoğraf) karşılığı. */
  colorClassOnDark?: string;
  /** Sekmelerin dizilişi (sola / ortaya / sağa). */
  alignClass?: string;
}) {
  const pathname = usePathname();
  const overlay = isPhotoRoute(pathname);
  const chosen = overlay ? colorClassOnDark : colorClass;

  return (
    <nav
      aria-label="Portal bölümleri"
      className={`print-hidden ${overlay ? "border-b border-white/20" : "border-b border-line bg-surface"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sekmeler taşarsa yatay kaydırılır; sayfa gövdesi asla yatay kaymaz.
            Hiza yalnızca sığdığında uygulanır (safe): taşan bir şeritte
            ortalama baştaki sekmeleri erişilemez kılardı. */}
        <ul className={`-mb-px flex gap-1 overflow-x-auto ${alignClass}`}>
          {items.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            // Saydam düzende pasif sekmeler de tam beyaz ve yarı kalın:
            // parlak fotoğrafın üzerinde soluk beyaz okunmuyordu.
            const state = overlay
              ? isActive
                ? `font-bold ${chosen || "text-white"} after:scale-x-100 after:bg-tfs-red`
                : `font-semibold ${chosen || "text-white"} after:scale-x-0 after:bg-white/70 hover:after:scale-x-100`
              : isActive
                ? `font-semibold ${chosen || "text-ink"} after:scale-x-100 after:bg-tfs-red`
                : `font-normal ${chosen || "text-ink-soft hover:text-ink"} after:scale-x-0 after:bg-line-strong hover:after:scale-x-100`;

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  /* Alt çizgi sert bir renk takası yerine soldan büyüyor:
                     sekme değişimi ani bir sıçrama gibi değil, bir hareket
                     gibi okunuyor. */
                  className={`relative flex items-center gap-2 px-4 py-3.5 ${sizeClass} ${
                    overlay ? "hero-ink-strong" : ""
                  } whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:transition-transform after:duration-200 after:ease-[var(--ease-out-brand)] after:content-[''] ${state}`}
                >
                  {item.label}
                  {item.count !== undefined && item.count > 0 ? (
                    <span
                      className={`rounded-brand px-1.5 py-0.5 text-[0.6875rem] font-semibold ${
                        overlay
                          ? "bg-white/20 text-white"
                          : "bg-surface-3 font-normal text-ink-faint"
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
