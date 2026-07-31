"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BulletinCard } from "@/components/BulletinCard";
import { SectionTitle } from "@/components/brand/SectionTitle";
import { formatDate, formatNumber } from "@/lib/format";
import { compareBulletinNo, matchesQuery } from "@/lib/search";
import type { BulletinWithCategory } from "@/lib/types";

type SortKey = "date-desc" | "date-asc" | "no-desc" | "no-asc";

const SORT_LABELS: Record<SortKey, string> = {
  "date-desc": "En yeni",
  "date-asc": "En eski",
  "no-desc": "Bülten no ↓",
  "no-asc": "Bülten no ↑",
};

/**
 * Bülten listesi ve yanındaki aranabilir indeks.
 *
 * Filtreleme istemci tarafında yapılır: bir sekmedeki bülten sayısı yüzler
 * mertebesinde kaldığı sürece bu, her tuş vuruşunda sunucuya gitmekten çok
 * daha akıcı bir deneyim verir. Arama Türkçe duyarlıdır (bkz. lib/search.ts):
 * "sec" yazan kullanıcı "SEÇ" içeren konuları da bulur.
 */
export function BulletinBrowser({ bulletins }: { bulletins: BulletinWithCategory[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");

  const visible = useMemo(() => {
    const filtered = bulletins.filter((b) =>
      matchesQuery(query, b.bulletin_no, b.subject, b.description),
    );

    const sorted = [...filtered];
    switch (sort) {
      case "date-asc":
        sorted.sort((a, b) => a.published_date.localeCompare(b.published_date));
        break;
      case "no-asc":
        sorted.sort((a, b) => compareBulletinNo(a.bulletin_no, b.bulletin_no));
        break;
      case "no-desc":
        sorted.sort((a, b) => compareBulletinNo(b.bulletin_no, a.bulletin_no));
        break;
      default:
        sorted.sort((a, b) => b.published_date.localeCompare(a.published_date));
    }
    return sorted;
  }, [bulletins, query, sort]);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[20rem_1fr] lg:px-8">
      {/* ————— İndeks paneli ————— */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <SectionTitle meta={`${formatNumber(visible.length)} / ${formatNumber(bulletins.length)}`}>
          Bülten İndeksi
        </SectionTitle>

        <label className="block">
          <span className="sr-only">Bülten no veya konu ile ara</span>
          <div className="relative">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Bülten no veya konu ara…"
              className="w-full rounded-brand border border-tfs-grey bg-white py-2.5 pr-3 pl-9 text-sm text-tfs-dark placeholder:text-tfs-dark-60 focus:border-tfs-red focus:outline-none"
            />
          </div>
        </label>

        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`rounded-brand border px-2 py-1 text-[0.6875rem] transition-colors ${
                sort === key
                  ? "border-tfs-red bg-tfs-red-10 font-semibold text-tfs-red"
                  : "border-tfs-grey text-tfs-dark-60 hover:border-tfs-dark-20 hover:text-tfs-dark"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* İndeks tablosu — uzun listelerde kendi içinde kayar. */}
        <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-brand border border-tfs-grey">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-light text-tfs-dark-60">
              Aramanızla eşleşen bülten bulunamadı.
            </p>
          ) : (
            <ul className="divide-y divide-tfs-grey-40">
              {visible.map((bulletin) => (
                <li key={bulletin.id}>
                  <a
                    href={`/api/dosya/${bulletin.id}?mod=indir`}
                    className="block px-3 py-2.5 transition-colors hover:bg-tfs-grey-20"
                    title={`${bulletin.bulletin_no} — ${bulletin.subject} (indirmek için tıklayın)`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-tfs-red">
                        {bulletin.bulletin_no}
                      </span>
                      <span className="shrink-0 text-[0.6875rem] text-tfs-dark-60">
                        {formatDate(bulletin.published_date)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-tfs-dark">
                      {bulletin.subject}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-2 text-[0.6875rem] font-light text-tfs-dark-60">
          İndeksteki bir satıra tıklamak bülteni indirir.
        </p>
      </aside>

      {/* ————— Bülten kartları ————— */}
      <section>
        <SectionTitle
          meta={query ? `"${query}" için ${formatNumber(visible.length)} sonuç` : undefined}
        >
          Bültenler
        </SectionTitle>

        {bulletins.length === 0 ? (
          <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-12 text-center text-sm font-light text-tfs-dark-60">
            Bu bölümde henüz yayımlanmış bülten yok.
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-12 text-center">
            <p className="text-sm font-light text-tfs-dark-60">
              Aramanızla eşleşen bülten bulunamadı.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 text-xs font-semibold text-tfs-red underline underline-offset-2"
            >
              Aramayı temizle
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((bulletin) => (
              <BulletinCard key={bulletin.id} bulletin={bulletin} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tfs-dark-60"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

/** Bülten görüntüleme sayfasındaki "geri" bağlantısı için yardımcı. */
export function BackToCategory({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/bultenler/${slug}`}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-tfs-red hover:underline"
    >
      <span aria-hidden="true">←</span> {name}
    </Link>
  );
}
