"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

/**
 * Portal sekmeleri.
 *
 * Aktif sekme kılavuzun vurgu rengiyle (#CE2028) alt çizgi alır. Sekme
 * listesi veritabanından geldiği için burada sabit bir liste yoktur.
 *
 * Ana sayfada tam ekran hero açıkken sekmeler fotoğrafın üzerinde saydam
 * durur (HeaderFrame); o durumda yazılar beyaz, sayaç rozetleri yarı saydam.
 */
export function SiteNav({
  items,
  linkClass = "text-sm",
  linkClassOnDark = "text-sm",
  alignClass = "justify-start",
  overlayOnHome = false,
}: {
  items: NavItem[];
  /** Ayarlardan gelen punto + renk sınıfı; sunucudan prop olarak gelir. */
  linkClass?: string;
  /** Aynı seçimin koyu zemin (fotoğraf) karşılığı. */
  linkClassOnDark?: string;
  /** Sekmelerin dizilişi (sola / ortaya / sağa). */
  alignClass?: string;
  overlayOnHome?: boolean;
}) {
  const pathname = usePathname();
  const overlay = overlayOnHome && pathname === "/";

  return (
    <nav
      aria-label="Portal bölümleri"
      className={`print-hidden ${overlay ? "border-b border-white/15" : "border-b border-line bg-surface"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sekmeler taşarsa yatay kaydırılır; sayfa gövdesi asla yatay kaymaz.
            Hiza yalnızca sığdığında uygulanır (safe): taşan bir şeritte
            ortalama baştaki sekmeleri erişilemez kılardı. */}
        <ul className={`-mb-px flex gap-1 overflow-x-auto ${alignClass}`}>
          {items.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            const state = overlay
              ? isActive
                ? "font-semibold text-white after:scale-x-100 after:bg-tfs-red"
                : "font-normal text-white/80 after:scale-x-0 after:bg-white/60 hover:text-white hover:after:scale-x-100"
              : isActive
                ? "font-semibold text-ink after:scale-x-100 after:bg-tfs-red"
                : "font-normal text-ink-soft after:scale-x-0 after:bg-line-strong hover:text-ink hover:after:scale-x-100";

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  /* Alt çizgi sert bir renk takası yerine soldan büyüyor:
                     sekme değişimi ani bir sıçrama gibi değil, bir hareket
                     gibi okunuyor. */
                  className={`relative flex items-center gap-2 px-4 py-3.5 ${
                    overlay ? `hero-ink ${linkClassOnDark}` : linkClass
                  } whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:transition-transform after:duration-200 after:ease-[var(--ease-out-brand)] after:content-[''] ${state}`}
                >
                  {item.label}
                  {item.count !== undefined && item.count > 0 ? (
                    <span
                      className={`rounded-brand px-1.5 py-0.5 text-[0.6875rem] font-normal ${
                        overlay ? "bg-white/15 text-white/85" : "bg-surface-3 text-ink-faint"
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
