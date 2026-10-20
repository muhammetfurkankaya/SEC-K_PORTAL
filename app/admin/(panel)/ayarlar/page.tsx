import type { Metadata } from "next";
import { PortalSettingsForm } from "./SettingsForm";
import { PasswordForm } from "./PasswordForm";
import { ResetSettingsForm } from "./ResetForm";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getRawSettings } from "@/lib/db/queries/settings";
import { listActiveCategories } from "@/lib/db/queries/categories";
import type { TypographySamples } from "./TypographyGroup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getRawSettings();

  // Punto önizlemelerinde gerçek içerik görünsün: portalın kendi başlıkları
  // ve ilk bülten sekmesinin adı. Örnek metin uydurmak, ayarın etkisini
  // gerçek uzunlukta göstermezdi.
  const firstCategory = listActiveCategories()[0]?.name ?? "SEÇ-K Bültenleri";
  const typographySamples: TypographySamples = {
    home_title: settings.portal_title || "Portal adı",
    home_kicker: settings.portal_subtitle || "Üst etiket",
    home_intro: settings.home_intro || "Giriş metni",
    page_title: firstCategory,
    page_eyebrow: settings.page_search_eyebrow || "Üst etiket",
    nav: settings.nav_home_label || "Ana Sayfa",
    section_title: settings.section_recent_title || "Bölüm başlığı",
  };

  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Portal metinlerini, QDMS bağlantılarını, duyuruyu ve bülten görünümünü buradan yönetin."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <Panel title="Portal Ayarları">
          <PortalSettingsForm settings={settings} typographySamples={typographySamples} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Şifre Değiştir">
            <PasswordForm />
          </Panel>

          <Panel title="Varsayılanlara Dön">
            <ResetSettingsForm />
          </Panel>
        </div>
      </div>
    </>
  );
}
