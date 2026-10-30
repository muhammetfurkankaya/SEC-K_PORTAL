import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { AdminIconLink } from "@/components/AdminIconLink";
import { HeaderFrame } from "@/components/HeaderFrame";
import { SiteNav, type NavItem } from "@/components/SiteNav";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { navAlignClass, textPartsFor } from "@/lib/appearance";

/**
 * Portalın üst bandı, sekmeleri ve duyuru şeridi.
 *
 * Sekmeler veritabanındaki aktif kategorilerden üretilir; admin panelinden
 * yeni sekme eklendiğinde burada kod değişikliği gerekmez.
 */
export function SiteHeader() {
  const settings = getSettings();
  const categories = listActiveCategories();
  const openSurveys = settings.surveysSectionVisible ? listOpenSurveys() : [];

  const items: NavItem[] = [
    { href: "/", label: settings.nav_home_label },
    ...categories.map((category) => ({
      href: `/bultenler/${category.slug}`,
      label: category.name,
      count: category.bulletin_count,
    })),
  ];

  if (openSurveys.length > 0) {
    items.push({
      href: "/anketler",
      label: settings.nav_surveys_label,
      count: openSurveys.length,
    });
  }

  // Menü her sayfada koyu zeminde (fotoğraf ya da koyu şerit): renk seçimi
  // koyu zemin karşılığıyla uygulanır.
  const nav = textPartsFor("nav", settings.type_nav_size, settings.type_nav_color, true);

  // Sekmelerin hizası: ortalıysa sekmeler sayfanın ortasında (iki yan sütun
  // eşit paylaşılır), değilse logonun ya da simgenin yanına yaslanır.
  // Yan sütunlar içeriklerinden dar olamaz (logo yanı yazısı kesilmesin);
  // orta sütun daralabilir — sekmeler sığmazsa kendi içinde yatay kayar,
  // sayfa yana taşmaz.
  const gridClass =
    settings.nav_align === "orta"
      ? "xl:grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)]"
      : "xl:grid-cols-[auto_minmax(0,1fr)_auto]";

  return (
    <HeaderFrame
      sticky={settings.header_sticky}
      gridClass={gridClass}
      logo={
        // Logo yanındaki yazı varsayılan olarak KAPALI: aynı ad hero
        // başlığında zaten büyük puntoyla duruyor. Ayarlardan açılabilir.
        <Link href="/" className="flex min-w-0 items-center" aria-label="Ana sayfa">
          <Logo
            variant="light"
            subtitle={
              settings.logo_subtitle_show
                ? settings.logo_subtitle_text || settings.portal_title
                : undefined
            }
          />
        </Link>
      }
      nav={
        <SiteNav
          items={items}
          sizeClass={nav.size}
          colorClass={nav.color}
          alignClass={navAlignClass(settings.nav_align)}
        />
      }
      admin={<AdminIconLink label={settings.nav_admin_label} />}
      announcement={
        settings.announcementVisible ? (
          <AnnouncementStrip text={settings.announcement} level={settings.announcementLevel} />
        ) : null
      }
    />
  );
}

/** Duyuru şeridi — tonu ayarlardan gelir. */
function AnnouncementStrip({ text, level }: { text: string; level: "bilgi" | "uyari" | "kritik" }) {
  const styles = {
    bilgi: "border-b border-line bg-surface-2 text-ink",
    uyari: "border-b border-accent/40 bg-accent-wash text-ink",
    kritik: "bg-tfs-red text-white",
  }[level];

  const labels = { bilgi: "Bilgi", uyari: "Duyuru", kritik: "Önemli" };
  const labelColor = level === "kritik" ? "text-white" : "text-accent-ink";

  return (
    <div className={`print-hidden ${styles}`} role={level === "kritik" ? "alert" : "status"}>
      <p className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <span className={`text-[0.6875rem] font-semibold tracking-[0.1em] uppercase ${labelColor}`}>
          {labels[level]}
        </span>
        <span className="font-light">{text}</span>
      </p>
    </div>
  );
}
