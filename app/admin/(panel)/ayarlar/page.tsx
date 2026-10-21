import type { Metadata } from "next";
import { PortalSettingsForm } from "./SettingsForm";
import { PasswordForm } from "./PasswordForm";
import { ResetSettingsForm } from "./ResetForm";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getRawSettings } from "@/lib/db/queries/settings";
import { listActiveCategories } from "@/lib/db/queries/categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getRawSettings();

  // Önizlemelerde gerçek içerik görünsün: ilk bülten sekmesinin adı. Örnek
  // metin uydurmak, ayarın etkisini gerçek uzunlukta göstermezdi.
  const firstCategory = listActiveCategories()[0]?.name ?? "SEÇ-K Bültenleri";

  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Portal metinlerini, yazı görünümünü, ana sayfa yerleşimini, duyuruyu ve bülten görünümünü buradan yönetin."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <Panel title="Portal Ayarları">
          <PortalSettingsForm settings={settings} firstCategory={firstCategory} />
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
