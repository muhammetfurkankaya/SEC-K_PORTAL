import type { Metadata } from "next";
import { AdminHeading, Panel } from "@/components/admin/AdminHeading";
import { PasswordForm } from "../PasswordForm";
import { SettingsTabs } from "../SettingsTabs";

export const metadata: Metadata = { title: "Şifre Değiştir" };

export default function PasswordPage() {
  return (
    <>
      <AdminHeading
        title="Ayarlar"
        description="Yönetici şifrenizi buradan değiştirin. Mevcut şifrenizi girmeniz gerekir."
      />

      <SettingsTabs active="sifre" />

      <div className="max-w-md">
        <Panel title="Şifre Değiştir">
          <PasswordForm />
        </Panel>
      </div>
    </>
  );
}
