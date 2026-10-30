"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

/**
 * Portal sekmeleri — tek satırlık üst menünün ortası (HeaderFrame).
 *
 * Aktif sekme kılavuzun vurgu rengiyle (#CE2028) alt çizgi alır. Sekme
 * listesi veritabanından geldiği için burada sabit bir liste yoktur.
 *
 * Menü her sayfada koyu zeminde durur (fotoğrafın üzerinde ya da koyu
 * şeritte), yazılar beyaz. Sekme yüksekliği menünün yüksekliğine bağlı
 * (`--bar-h` / dar ekranda `--nav-h`, globals.css): menü kaydırınca
 * incelince sekmeler de incelir, kırmızı çizgi menünün alt kenarında kalır.
 *
 * Renk: ayarlardan bir renk seçilmişse o renk etkin/pasif durum renklerinin
 * YERİNE kullanılır; ikisi birlikte verildiğinde CSS sırasında seçim
 * kayboluyordu. Etkin sekme bu durumda da kalın yazı ve kırmızı çizgiyle
 * ayrışır.
 */
export function SiteNav({
  items,
  sizeClass = "text-sm",
  colorClass = "",
  alignClass = "justify-center-safe",
}: {
  items: NavItem[];
  /** Ayarlardan gelen punto sınıfı. */
  sizeClass?: string;
  /** Ayarlardan gelen renk (koyu zemin karşılığı); "Varsayılan" ise boş. */
  colorClass?: string;
  /** Sekmelerin dizilişi (sola / ortaya / sağa). */
  alignClass?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal bölümleri" className="min-w-0">
      {/* Sekmeler taşarsa yatay kaydırılır; sayfa gövdesi asla yatay kaymaz.
          Hiza yalnızca sığdığında uygulanır (safe). */}
      <ul
        className={`flex overflow-x-auto px-1 [scrollbar-width:none] sm:px-3 lg:px-5 xl:px-0 ${alignClass}`}
      >
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          const state = isActive
            ? `font-bold ${colorClass || "text-white"} after:scale-x-100 after:bg-tfs-red`
            : `font-semibold ${colorClass || "text-white/90 hover:text-white"} after:scale-x-0 after:bg-white/70 hover:after:scale-x-100`;

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                /* Alt çizgi sert bir renk takası yerine soldan büyüyor:
                   sekme değişimi ani bir sıçrama gibi değil, bir hareket
                   gibi okunuyor. */
                className={`site-nav-link hero-ink-strong relative flex items-center gap-2 px-3.5 ${sizeClass} whitespace-nowrap transition-colors after:absolute after:inset-x-3.5 after:bottom-0 after:h-[3px] after:origin-left after:transition-transform after:duration-200 after:ease-[var(--ease-out-brand)] after:content-[''] ${state}`}
              >
                {item.label}
                {item.count !== undefined && item.count > 0 ? (
                  <span className="rounded-brand bg-white/20 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
