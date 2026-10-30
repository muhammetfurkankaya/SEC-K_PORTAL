import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/db/queries/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim Girişi" };

export default async function LoginPage() {
  // Oturum açıkken giriş ekranını göstermenin anlamı yok.
  if (await getSessionUser()) redirect("/admin");

  const settings = getSettings();

  return (
    // Portalın tamamı gibi yönetim paneli de koyu görünümde (app/layout.tsx).
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="bg-tfs-dark">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Portala dön">
            <Logo variant="light" subtitle={settings.portal_title} />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-brand border border-line bg-surface p-6">
          <div className="brand-bar mb-6 pl-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase">
              Yönetim Paneli
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink">Giriş yapın</h1>
          </div>

          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs font-light text-ink-faint">
          Bültenleri ve anketleri yönetmek için yetkili hesabınızla giriş yapın.
        </p>
        <Link
          href="/"
          className="mt-2 text-center text-xs font-semibold text-accent-ink hover:underline"
        >
          ← Portala dön
        </Link>
      </div>
    </div>
  );
}
