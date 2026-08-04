import type { Metadata } from "next";
import { PasswordForm, PortalSettingsForm, ResetSettingsForm } from "./SettingsForms";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getRawSettings } from "@/lib/db/queries/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getRawSettings();

  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Portal metinlerini, QDMS bağlantılarını, duyuruyu ve bülten görünümünü buradan yönetin."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <Panel title="Portal Ayarları">
          <PortalSettingsForm settings={settings} />
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
