import Link from "next/link";
import { formatDate, formatFileSize } from "@/lib/format";
import type { BulletinWithCategory } from "@/lib/types";

type BulletinCardProps = {
  bulletin: BulletinWithCategory;
  /** Kategori adını kartta göster (ana sayfadaki karma listede gerekir). */
  showCategory?: boolean;
};

/**
 * Bülten kartı.
 *
 * Kullanıcı isteği gereği kartın üzerine tıklamak PDF'i **indirir**.
 * Ayrıca indirmeden okumak isteyenler için ayrı bir "Görüntüle" bağlantısı
 * bulunur.
 *
 * Kapak görseli üretmek için sunucuya poppler/pdf.js kurmak gerekirdi;
 * bunun yerine kılavuzun renk ve tipografi diliyle çizilen tipografik bir
 * kapak kullanıyoruz — bülten numarası ilk bakışta okunur.
 */
export function BulletinCard({ bulletin, showCategory = false }: BulletinCardProps) {
  return (
    <article className="group relative flex flex-col rounded-brand border border-tfs-grey bg-white transition-colors hover:border-tfs-red">
      {/* Tıklanabilir alan: kartın tamamını kaplar ve dosyayı indirir. */}
      <a
        href={`/api/dosya/${bulletin.id}?mod=indir`}
        className="absolute inset-0 z-10"
        aria-label={`${bulletin.bulletin_no} numaralı bülteni indir: ${bulletin.subject}`}
      >
        <span className="sr-only">İndir</span>
      </a>

      {/* Tipografik kapak */}
      <div className="relative flex aspect-4/3 flex-col justify-between overflow-hidden rounded-t-brand bg-tfs-dark p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="brand-bar pl-2 text-[0.625rem] font-semibold tracking-[0.14em] text-tfs-grey uppercase">
            Bülten
          </span>
          <span className="rounded-brand bg-tfs-red px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wider text-white">
            PDF
          </span>
        </div>

        <p className="truncate text-3xl leading-none font-semibold text-white">
          {bulletin.bulletin_no}
        </p>

        <p className="line-clamp-2 text-[0.6875rem] leading-snug font-light text-tfs-grey">
          {bulletin.subject}
        </p>
      </div>

      {/* Bilgi alanı */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {showCategory ? (
          <span className="text-[0.625rem] font-semibold tracking-[0.1em] text-tfs-red uppercase">
            {bulletin.category_name}
          </span>
        ) : null}

        <h3 className="line-clamp-2 text-sm font-semibold text-tfs-dark">{bulletin.subject}</h3>

        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tfs-dark-60">
          <span>{formatDate(bulletin.published_date)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatFileSize(bulletin.file_size)}</span>
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-tfs-grey-40 pt-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-tfs-red">
            <DownloadIcon />
            İndir
          </span>
          {/* z-20: kartı kaplayan indirme bağlantısının üzerinde kalmalı. */}
          <Link
            href={`/bultenler/${bulletin.category_slug}/${bulletin.id}`}
            className="relative z-20 text-xs text-tfs-dark-60 underline decoration-tfs-grey underline-offset-2 hover:text-tfs-dark hover:decoration-tfs-red"
          >
            Görüntüle
          </Link>
        </div>
      </div>
    </article>
  );
}

function DownloadIcon() {
  return (
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
  );
}
