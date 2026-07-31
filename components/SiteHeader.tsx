import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SiteNav, type NavItem } from "@/components/SiteNav";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";

/**
 * Portalın üst bandı ve sekmeleri.
 *
 * Sekmeler veritabanındaki aktif kategorilerden üretilir; admin panelinden
 * yeni sekme eklendiğinde burada kod değişikliği gerekmez.
 */
export function SiteHeader() {
  const settings = getSettings();
  const categories = listActiveCategories();
  const openSurveys = listOpenSurveys();

  const items: NavItem[] = [
    { href: "/", label: "Ana Sayfa" },
    ...categories.map((category) => ({
      href: `/bultenler/${category.slug}`,
      label: category.name,
      count: category.bulletin_count,
    })),
  ];

  // Doldurulabilir anket varsa sekmeye ekle — yoksa boş sayfa göstermeyelim.
  if (openSurveys.length > 0) {
    items.push({ href: "/anketler", label: "Anketler", count: openSurveys.length });
  }

  return (
    <header>
      {/* Kılavuz s.51: koyu zemin (#1D252D) + beyaz metin */}
      <div className="bg-tfs-dark print-hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Ana sayfa">
            <Logo variant="light" subtitle={settings.portal_title} />
          </Link>

          <Link
            href="/admin"
            className="rounded-brand border border-tfs-dark-80 px-3 py-1.5 text-xs font-semibold tracking-wide text-tfs-grey uppercase transition-colors hover:border-tfs-red hover:text-white"
          >
            Yönetim
          </Link>
        </div>
      </div>

      {settings.announcement.trim() ? (
        <div className="border-b border-tfs-red/30 bg-tfs-red-10 print-hidden">
          <p className="mx-auto max-w-7xl px-4 py-2.5 text-sm text-tfs-dark sm:px-6 lg:px-8">
            <span className="font-semibold text-tfs-red">Duyuru: </span>
            {settings.announcement}
          </p>
        </div>
      ) : null}

      <SiteNav items={items} />
    </header>
  );
}
