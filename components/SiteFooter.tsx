import { getSettings } from "@/lib/db/queries/settings";

export function SiteFooter() {
  const settings = getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-tfs-grey bg-tfs-grey-20 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-tfs-dark-60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          {settings.portal_title} · {settings.portal_subtitle}
        </p>
        <p>
          Turkish Fuel Services · {year} · Şirket içi kullanım içindir
        </p>
      </div>
    </footer>
  );
}
