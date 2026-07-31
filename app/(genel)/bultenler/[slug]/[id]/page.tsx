import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackToCategory } from "@/components/BulletinBrowser";
import { getPublishedBulletin } from "@/lib/db/queries/bulletins";
import { formatDate, formatFileSize } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bulletin = getPublishedBulletin(Number(id));
  return {
    title: bulletin ? `${bulletin.bulletin_no} — ${bulletin.subject}` : "Bülten",
  };
}

/**
 * Bülten görüntüleme ekranı.
 *
 * PDF'i tarayıcının kendi görüntüleyicisiyle gösteriyoruz; böylece pdf.js
 * gibi ek bir bağımlılık ve sunucu tarafı dönüştürme gerekmiyor.
 */
export default async function BulletinViewerPage({ params }: Props) {
  const { slug, id } = await params;
  const bulletin = getPublishedBulletin(Number(id));

  // Bülten başka bir sekmeye taşınmış olabilir; yanlış slug ile açılmasın.
  if (!bulletin || bulletin.category_slug !== slug) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BackToCategory slug={bulletin.category_slug} name={bulletin.category_name} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="brand-bar pl-4">
          <p className="font-mono text-xs font-semibold tracking-wider text-tfs-red">
            {bulletin.bulletin_no}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-tfs-dark sm:text-2xl">
            {bulletin.subject}
          </h1>
          <p className="mt-1 text-xs text-tfs-dark-60">
            {formatDate(bulletin.published_date)} · {formatFileSize(bulletin.file_size)}
          </p>
        </div>

        <a
          href={`/api/dosya/${bulletin.id}?mod=indir`}
          className="inline-flex items-center gap-2 rounded-brand bg-tfs-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tfs-dark"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="size-4"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
          </svg>
          PDF indir
        </a>
      </div>

      {bulletin.description ? (
        <p className="mt-4 max-w-3xl text-sm font-light text-tfs-dark-80">
          {bulletin.description}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-brand border border-tfs-grey bg-tfs-grey-20">
        <iframe
          src={`/api/dosya/${bulletin.id}`}
          title={`${bulletin.bulletin_no} — ${bulletin.subject}`}
          className="h-[75vh] min-h-[30rem] w-full"
        />
      </div>

      <p className="mt-2 text-xs font-light text-tfs-dark-60">
        PDF görüntülenemiyorsa yukarıdaki “PDF indir” düğmesini kullanabilirsiniz.
      </p>
    </div>
  );
}
