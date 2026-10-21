import { getSettings } from "@/lib/db/queries/settings";

export function SiteFooter() {
  const settings = getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface-2 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-semibold text-ink">{settings.portal_title}</span>
          {settings.portal_subtitle ? ` · ${settings.portal_subtitle}` : ""}
        </p>
        <p>
          {settings.footer_company} · {year}
          {settings.footer_note ? ` · ${settings.footer_note}` : ""}
        </p>
      </div>
    </footer>
  );
}
