import Link from "next/link";
import { formatDate, formatFileSize } from "@/lib/format";
import type { BulletinWithCategory } from "@/lib/types";

type BulletinCardProps = {
  bulletin: BulletinWithCategory;
  /** Kategori adını kartta göster (ana sayfadaki karma listede gerekir). */
  showCategory?: boolean;
};

/**
 * Bülten kartı — ana sayfadaki görsel gösterim.
 *
 * Kartın gövdesine tıklamak bülteni **okuma ekranında açar**, indirmez;
 * indirme köşedeki ayrı düğmeyle yapılır. Bu, listedeki davranışla aynı.
 *
 * Konu kartta yalnızca bir kez yazılır: koyu kapak bülten numarasını
 * (plakayı) taşır, gövde konuyu. Kapak görseli PDF'ten üretilmiyor — bunun
 * için sunucuya poppler kurmak gerekirdi; tipografik kapak aynı işi
 * bağımlılık eklemeden yapıyor.
 */
export function BulletinCard({ bulletin, showCategory = false }: BulletinCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-brand border border-tfs-grey bg-white transition-colors hover:border-tfs-red">
      {/* Kartın tamamı okuma ekranını açar. */}
      <Link
        href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${bulletin.bulletin_no} — ${bulletin.subject} bültenini aç`}
      >
        <span className="sr-only">Aç</span>
      </Link>

      {/* Koyu kapak: plaka + dosya türü */}
      <div className="flex items-center justify-between gap-2 bg-tfs-dark px-3 py-3">
        <span className="placard">{bulletin.bulletin_no}</span>
        <span className="rounded-brand bg-tfs-red px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wider text-white">
          PDF
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {showCategory ? (
          <span className="text-[0.625rem] font-semibold tracking-[0.1em] text-tfs-red uppercase">
            {bulletin.category_name}
          </span>
        ) : null}

        <h3 className="line-clamp-3 text-sm leading-snug font-semibold text-tfs-dark">
          {bulletin.subject}
        </h3>

        <p className="tnum mt-auto text-xs text-tfs-dark-60">
          {formatDate(bulletin.published_date)} · {formatFileSize(bulletin.file_size)}
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-tfs-grey-40 pt-2">
          <span className="text-xs font-semibold text-tfs-red">Aç →</span>

          {/* z-20: kartı kaplayan bağlantının üzerinde kalmalı. */}
          <a
            href={`/api/dosya/${bulletin.id}?mod=indir`}
            title={`${bulletin.bulletin_no} — indir`}
            aria-label={`${bulletin.bulletin_no} bültenini indir`}
            className="relative z-20 flex size-7 items-center justify-center rounded-brand border border-tfs-grey text-tfs-dark-60 transition-colors hover:border-tfs-red hover:bg-tfs-red hover:text-white"
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
          </a>
        </div>
      </div>
    </article>
  );
}
