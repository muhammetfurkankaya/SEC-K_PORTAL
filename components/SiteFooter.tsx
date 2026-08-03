import { getSettings } from "@/lib/db/queries/settings";

export function SiteFooter() {
  const settings = getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-tfs-grey bg-tfs-grey-20 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-6 text-xs text-tfs-dark-60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-semibold text-tfs-dark">{settings.portal_title}</span>
          {settings.portal_subtitle ? ` · ${settings.portal_subtitle}` : ""}
        </p>
        <p>
          Turkish Fuel Services · {year}
          {settings.footer_note ? ` · ${settings.footer_note}` : ""}
        </p>
      </div>
    </footer>
  );
}
