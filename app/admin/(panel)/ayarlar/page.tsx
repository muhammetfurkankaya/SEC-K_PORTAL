import type { Metadata } from "next";
import { PortalSettingsForm } from "./SettingsForm";
import { ResetSettingsForm } from "./ResetForm";
import { SettingsTabs } from "./SettingsTabs";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getRawSettings, getSettings } from "@/lib/db/queries/settings";
import { resolveHomeHero } from "@/lib/hero";
import { listActiveCategories } from "@/lib/db/queries/categories";
import { findLogo } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getRawSettings();

  // Önizlemelerde gerçek içerik görünsün: ilk bülten sekmesinin adı. Örnek
  // metin uydurmak, ayarın etkisini gerçek uzunlukta göstermezdi.
  const firstCategory = listActiveCategories()[0]?.name ?? "SEÇ-K Bültenleri";

  const typed = getSettings();
  const resolvedHero = resolveHomeHero(typed);
  const hero = {
    currentSrc: resolvedHero.imageSrc,
    uploaded: resolvedHero.uploaded,
    strongScrim: resolvedHero.scrim === "strong",
    title: typed.portal_title,
  };

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
            hero={hero}
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
