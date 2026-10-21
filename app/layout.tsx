import type { Metadata, Viewport } from "next";
import { safeThemeSettings } from "@/lib/db/queries/settings";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Tema varsayılanı ayarlardan okunuyor; her istekte güncel olmalı.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "SEÇ-K Portalı | Turkish Fuel Services",
    template: "%s | SEÇ-K Portalı",
  },
  description:
    "Turkish Fuel Services SEÇ-K Portalı — sağlık, emniyet, çevre ve kalite bültenleri ve anketler.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d252d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = safeThemeSettings();

  return (
    // data-theme sunucuda belirleniyor, sonra <head>'deki betik ziyaretçinin
    // kendi seçimini (ve "Sistem" için cihaz tercihini) sayfa BOYANMADAN
    // uyguluyor. suppressHydrationWarning zorunlu: betik özniteliği React
    // devreye girmeden değiştiriyor, bu bilinçli bir farklılık.
    <html
      lang="tr"
      data-theme={theme.themeDefault === "koyu" ? "dark" : "light"}
      data-theme-default={theme.themeDefault}
      data-theme-lock={theme.toggleVisible ? undefined : "1"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
