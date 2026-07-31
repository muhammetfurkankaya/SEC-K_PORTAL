import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-tfs-dark">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Ana sayfa">
            <Logo variant="light" subtitle="SEÇ-K Portalı" />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center px-4 py-16">
        <div className="brand-bar pl-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
            Sayfa bulunamadı
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-tfs-dark">
            Aradığınız sayfaya ulaşılamadı
          </h1>
          <p className="mt-2 text-sm font-light text-tfs-dark-80">
            Bağlantı değişmiş veya içerik yayından kaldırılmış olabilir.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-brand bg-tfs-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
