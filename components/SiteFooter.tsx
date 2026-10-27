import { getSettings } from "@/lib/db/queries/settings";
import { footerLines } from "@/lib/footer";

export function SiteFooter() {
  const settings = getSettings();
  const { brand, legal } = footerLines(settings, new Date().getFullYear());

  // Panelde her şey boşaltılıp yıl da kapatılırsa alt bilgi hiç çizilmez.
  if (!brand.title && !brand.rest && !legal) return null;

  return (
    <footer className="mt-16 border-t border-line bg-surface-2 print-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {brand.title || brand.rest ? (
          <p>
            {brand.title ? <span className="font-semibold text-ink">{brand.title}</span> : null}
            {brand.title && brand.rest ? " · " : ""}
            {brand.rest}
          </p>
        ) : null}
        {legal ? <p>{legal}</p> : null}
      </div>
    </footer>
  );
}
