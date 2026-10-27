import Link from "next/link";

const TABS = [
  { href: "/admin/ayarlar", label: "Portal Ayarları", key: "portal" },
  { href: "/admin/ayarlar/sifre", label: "Şifre Değiştir", key: "sifre" },
] as const;

/**
 * Ayarlar bölümünün alt sekmeleri.
 *
 * Şifre değiştirme formu her ayar ekranında sağda sabit duruyordu; artık
 * yalnızca istendiğinde, kendi sekmesinde açılıyor.
 */
export function SettingsTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Ayar bölümleri" className="mb-6 border-b border-tfs-grey">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`block border-b-[3px] px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-tfs-red font-semibold text-tfs-dark"
                    : "border-transparent text-tfs-dark-80 hover:border-tfs-grey hover:text-tfs-dark"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
