"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/bultenler", label: "Bültenler" },
  { href: "/admin/kategoriler", label: "Sekmeler" },
  { href: "/admin/anketler", label: "Anketler" },
  { href: "/admin/ayarlar", label: "Ayarlar" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Yönetim bölümleri" className="border-b border-tfs-grey bg-white print-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {ITEMS.map((item) => {
            // "/admin" yalnızca tam eşleşmede aktif olmalı; aksi halde tüm
            // alt sayfalarda da vurgulanırdı.
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block border-b-[3px] px-4 py-3.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-tfs-red font-semibold text-tfs-dark"
                      : "border-transparent text-tfs-dark-80 hover:border-tfs-grey hover:text-tfs-dark"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
