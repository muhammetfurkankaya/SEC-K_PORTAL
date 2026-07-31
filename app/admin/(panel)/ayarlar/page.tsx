import type { Metadata } from "next";
import { PasswordForm, PortalSettingsForm } from "./SettingsForms";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { getSettings } from "@/lib/db/queries/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  const settings = getSettings();

  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Portal bilgilerini, QDMS bağlantılarını ve hesap şifrenizi yönetin."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel title="Portal Ayarları">
          <PortalSettingsForm settings={settings} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Şifre Değiştir">
            <PasswordForm />
          </Panel>

          <Panel title="Yedekleme">
            <p className="text-sm font-light text-tfs-dark-80">
              Tüm bültenler ve anket cevapları sunucudaki <code className="text-tfs-red">data/</code>{" "}
              klasöründe tutulur. Düzenli yedek için bu klasörü kopyalamak yeterlidir.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
