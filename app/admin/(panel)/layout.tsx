import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { DefaultPasswordNotice } from "@/components/admin/DefaultPasswordNotice";
import { Logo } from "@/components/brand/Logo";
import { logoutAction } from "@/app/admin/actions";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db/queries/settings";

/**
 * Korumalı yönetim paneli yerleşimi.
 *
 * requireUser() oturumu doğrular ve yoksa giriş ekranına yönlendirir.
 * Buna ek olarak her Server Action kendi içinde de requireUser() çağırır:
 * yerleşim kontrolü sayfaları korur, action'lar ayrıca kendi yetkisini
 * doğrulamalıdır.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = getSettings();

  return (
    // Yönetim paneli her zaman gündüz görünümünde: bileşenleri henüz
    // gece moduna göre taşınmadı. data-theme bu alt ağaçtaki tüm anlamsal
    // renkleri gündüz değerlerine sabitliyor.
    <div data-theme="light" className="flex min-h-screen flex-col bg-tfs-grey-20">
      <header>
        <div className="bg-tfs-dark print-hidden">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Logo variant="light" subtitle={`${settings.portal_title} · Yönetim`} />
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className="text-xs text-tfs-grey hover:text-white"
              >
                Portalı görüntüle ↗
              </Link>

              <span className="hidden text-xs text-tfs-dark-60 sm:inline" aria-hidden="true">
                |
              </span>

              <span className="text-xs text-tfs-grey">{user.username}</span>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-brand border border-tfs-dark-80 px-3 py-1.5 text-xs font-semibold tracking-wide text-tfs-grey uppercase transition-colors hover:border-tfs-red hover:text-white"
                >
                  Çıkış
                </button>
              </form>
            </div>
          </div>
        </div>

        <AdminNav />
        <DefaultPasswordNotice userId={user.id} />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
