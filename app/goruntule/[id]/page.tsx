import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfViewer } from "@/components/PdfViewer";
import { getPublishedBulletin } from "@/lib/db/queries/bulletins";
import { getSettings } from "@/lib/db/queries/settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function load(id: string) {
  const bulletinId = Number(id);
  return Number.isInteger(bulletinId) && bulletinId > 0 ? getPublishedBulletin(bulletinId) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bulletin = load((await params).id);
  return { title: bulletin ? `${bulletin.bulletin_no} — ${bulletin.subject}` : "Bülten" };
}

/**
 * Bültenin tam ekran, salt görüntüleme sayfası ("Yeni sekmede aç").
 *
 * Eskiden ham PDF açılıyordu ve tarayıcının çizim/not araçlı görüntüleyicisi
 * geliyordu. Bu sayfa portal üst bandı olmadan, yalnızca belgeyi ve
 * yakınlaştırma çubuğunu gösterir.
 */
export default async function ViewerPage({ params }: Props) {
  const bulletin = load((await params).id);
  if (!bulletin) notFound();

  const settings = getSettings();

  return (
    <div className="flex h-dvh flex-col bg-surface-3">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-tfs-dark px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="placard text-sm">{bulletin.bulletin_no}</span>
          <h1 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">
            {bulletin.subject}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
            className="rounded-brand border border-white/30 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-white"
          >
            Portala dön
          </Link>
          <a
            href={`/api/dosya/${bulletin.id}?mod=indir`}
            className="rounded-brand bg-tfs-red px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a81a20]"
          >
            {settings.btn_download}
          </a>
        </div>
      </header>
      <div className="brand-seam" aria-hidden="true" />

      <PdfViewer
        src={`/api/dosya/${bulletin.id}`}
        title={`${bulletin.bulletin_no} — ${bulletin.subject}`}
        downloadHref={`/api/dosya/${bulletin.id}?mod=indir`}
        downloadLabel={settings.btn_download}
        className="flex-1"
        // Tam ekranda sayfanın tamamı görünsün; okumak için büyütülebilir.
        initialFit="sayfa"
      />
    </div>
  );
}
