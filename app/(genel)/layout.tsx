import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Genel (giriş gerektirmeyen) sayfaların yerleşimi.
 *
 * QR ile açılan anket formu (/anket/[token]) bu yerleşimin dışındadır:
 * o ekran mobilde tek işe odaklanmalı, sekmelerle dağıtılmamalıdır.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
