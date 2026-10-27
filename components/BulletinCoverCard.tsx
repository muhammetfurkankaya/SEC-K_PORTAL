import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { BulletinWithCategory } from "@/lib/types";

/**
 * Kapaklı bülten kartı — ana sayfada "Yalnızca kart" görünümü.
 *
 * Solda PDF'in ilk sayfası (yüklemede yönetim panelinde üretilen küçük
 * JPEG, bkz. lib/pdfjs-client.ts), sağda tarih, konu ve "İncele". Kapak
 * henüz üretilmemişse aynı ölçüde koyu, yazılı bir kapak durur — boş kutu
 * kalmaz.
 *
 * Kartın tamamı okuma ekranını açar; indirme ayrı düğmeyle yapılır.
 */
export function BulletinCoverCard({
  bulletin,
  coverUrl,
  openLabel,
}: {
  bulletin: BulletinWithCategory;
  coverUrl: string | null;
  openLabel: string;
}) {
  return (
    <article className="group relative flex gap-4 rounded-brand border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-[180ms] ease-[var(--ease-out-brand)] hover:border-accent hover:shadow-brand-raised sm:gap-6 sm:p-6">
      <Link
        href={`/bultenler/${bulletin.category_slug}?bulten=${bulletin.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${bulletin.bulletin_no} — ${bulletin.subject} bültenini aç`}
      >
        <span className="sr-only">{openLabel}</span>
      </Link>

      {/* Kapak: A4 oranı. */}
      <div className="w-24 shrink-0 sm:w-36 lg:w-40">
        {coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- küçük, önceden
             boyutlandırılmış JPEG; paket sharp içermiyor */
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[1/1.414] w-full border border-line bg-white object-cover object-top shadow-brand-raised transition-transform duration-[180ms] ease-[var(--ease-out-brand)] group-hover:-translate-y-0.5"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[1/1.414] w-full flex-col justify-between border-t-[3px] border-tfs-red bg-tfs-dark p-2.5 shadow-brand-raised sm:p-3"
          >
            <span className="text-[0.5625rem] font-semibold tracking-[0.12em] text-tfs-grey uppercase sm:text-[0.625rem]">
              {bulletin.category_name}
            </span>
            <span className="placard self-start text-[0.625rem] sm:text-xs">
              {bulletin.bulletin_no}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="tnum text-xs text-ink-faint sm:text-sm">
          {formatDate(bulletin.published_date)}
        </p>

        <h3 className="mt-1.5 line-clamp-3 text-lg leading-snug font-bold tracking-[-0.01em] text-ink sm:mt-2 sm:text-2xl">
          {bulletin.subject}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="placard-quiet">{bulletin.bulletin_no}</span>
          <span className="text-[0.625rem] font-semibold tracking-[0.1em] text-accent-ink uppercase">
            {bulletin.category_name}
          </span>
        </div>

        {bulletin.description ? (
          <p className="mt-2.5 line-clamp-2 hidden text-sm leading-relaxed font-light text-ink-soft sm:block">
            {bulletin.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <span className="inline-flex items-center gap-2 rounded-brand border-2 border-tfs-red px-4 py-2 text-xs font-bold tracking-[0.12em] text-accent-ink uppercase transition-colors group-hover:bg-tfs-red group-hover:text-white sm:px-5 sm:py-2.5">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
            {openLabel}
          </span>

          {/* z-20: kartı kaplayan bağlantının üzerinde kalmalı. */}
          <a
            href={`/api/dosya/${bulletin.id}?mod=indir`}
            title={`${bulletin.bulletin_no} — indir`}
            aria-label={`${bulletin.bulletin_no} bültenini indir`}
            className="relative z-20 flex size-9 items-center justify-center rounded-brand border border-line text-ink-faint transition-colors hover:border-accent hover:bg-tfs-red hover:text-white"
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
