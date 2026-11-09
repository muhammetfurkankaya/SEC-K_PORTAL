import type { Metadata } from "next";
import { PortalSettingsForm } from "./SettingsForm";
import { ResetSettingsForm } from "./ResetForm";
import { SettingsTabs } from "./SettingsTabs";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getRawSettings } from "@/lib/db/queries/settings";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { listOpenSurveys } from "@/lib/db/queries/surveys";
import { findLogo } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getRawSettings();

  // Önizlemelerde gerçek içerik görünsün: ilk bülten sekmesinin adı. Örnek
  // metin uydurmak, ayarın etkisini gerçek uzunlukta göstermezdi.
  const first = listActiveCategories()[0];
  const firstCategory = first?.name ?? "SEÇ-K Bültenleri";
  // Sekme önizlemesindeki sayılar da gerçek: yayındaki bülten, açık anket.
  const navCounts = { category: first?.bulletin_count ?? 0, surveys: listOpenSurveys().length };

  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Portal metinlerini, yazı görünümünü, ana sayfa yerleşimini, duyuruyu ve bülten görünümünü buradan yönetin."
      />

      <SettingsTabs active="portal" />

      <div className="space-y-6">
        <Panel title="Portal Ayarları">
          <PortalSettingsForm
            settings={settings}
            firstCategory={firstCategory}
            navCounts={navCounts}
            logoSrc={findLogo("light")}
          />
        </Panel>

        <Panel title="Varsayılanlara Dön">
          <ResetSettingsForm />
        </Panel>
      </div>
    </>
  );
}
