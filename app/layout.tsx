import type { Metadata, Viewport } from "next";
import "./globals.css";

// Sayfalar veritabanından okuyor; her istekte güncel olmalı.
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
  themeColor: "#12181d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Portalın tamamı (yönetim paneli dahil) koyu görünümde; gece/gündüz
    // seçimi kaldırıldı. Renkler globals.css'teki [data-theme="dark"]
    // değerlerinden gelir. Yazdırma çıktısı yine açık zeminlidir.
    <html lang="tr" data-theme="dark">
      <body className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
