"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

/**
 * Portal sekmeleri.
 *
 * Aktif sekme kılavuzun vurgu rengiyle (#CE2028) alt çizgi alır. Sekme
 * listesi veritabanından geldiği için burada sabit bir liste yoktur.
 */
export function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Portal bölümleri"
      className="border-b border-tfs-grey bg-white print-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sekmeler taşarsa yatay kaydırılır; sayfa gövdesi asla yatay kaymaz. */}
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {items.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 border-b-[3px] px-4 py-3.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-tfs-red font-semibold text-tfs-dark"
                      : "border-transparent font-normal text-tfs-dark-80 hover:border-tfs-grey hover:text-tfs-dark"
                  }`}
                >
                  {item.label}
                  {item.count !== undefined && item.count > 0 ? (
                    <span className="rounded-brand bg-tfs-grey-40 px-1.5 py-0.5 text-[0.6875rem] font-normal text-tfs-dark-60">
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
