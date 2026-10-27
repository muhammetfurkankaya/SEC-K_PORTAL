import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeaderFrame } from "@/components/HeaderFrame";
import { SiteNav, type NavItem } from "@/components/SiteNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { getSettings } from "@/lib/db/queries/settings";
import { navAlignClass, textClass } from "@/lib/appearance";

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

  // Tam ekran hero'da sekmeler fotoğrafın üzerinde duruyor (HeaderFrame).
  const overlayOnHome = settings.hero_height === "tam";

  return (
    <HeaderFrame
      overlayOnHome={overlayOnHome}
      bar={
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo yanındaki yazı varsayılan olarak KAPALI: aynı ad hero
              başlığında zaten büyük puntoyla duruyor. Ayarlardan açılabilir
              ve metni değiştirilebilir. */}
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

          <div className="flex shrink-0 items-center gap-2">
            {settings.theme_toggle_visible ? <ThemeToggle /> : null}
            <Link
              href="/admin"
              className="rounded-brand border border-tfs-dark-80 px-3 py-1.5 text-xs font-semibold tracking-wide text-tfs-grey uppercase transition-colors hover:border-accent hover:text-white"
            >
              {settings.nav_admin_label}
            </Link>
          </div>
        </div>
      }
      nav={
        <SiteNav
          items={items}
          linkClass={textClass(settings, "nav")}
          linkClassOnDark={textClass(settings, "nav", { onDark: true })}
          alignClass={navAlignClass(settings.nav_align)}
          overlayOnHome={overlayOnHome}
        />
      }
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
