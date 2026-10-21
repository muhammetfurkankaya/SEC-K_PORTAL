import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  return (
    <html lang="tr">
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
