import type { TypedSettings } from "@/lib/settings-schema";

/**
 * Alt bilginin iki satırı.
 *
 * Yalnızca dolu parçalar birleştirilir: şirket adı silinirse satır
 * "· 2026" diye başlamaz, her şey silinip yıl kapatılırsa satır hiç
 * çıkmaz. React'tan bağımsız — tests/footer.test.ts.
 */
export function footerLines(
  settings: Pick<
    TypedSettings,
    "portal_title" | "portal_subtitle" | "footer_company" | "footer_note" | "footer_show_year"
  >,
  year: number,
): { brand: { title: string; rest: string }; legal: string } {
  const join = (parts: (string | false)[]) =>
    parts
      .map((part) => (part || "").trim())
      .filter(Boolean)
      .join(" · ");

  return {
    brand: { title: settings.portal_title.trim(), rest: settings.portal_subtitle.trim() },
    legal: join([
      settings.footer_company,
      settings.footer_show_year && String(year),
      settings.footer_note,
    ]),
  };
}
