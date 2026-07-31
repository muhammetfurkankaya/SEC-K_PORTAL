"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteBulletinAction, togglePublishAction } from "@/app/admin/(panel)/bultenler/actions";
import { SubmitButton, TextInput } from "@/components/ui/form";
import { formatDate, formatFileSize, formatNumber } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import type { BulletinWithCategory, CategoryWithCount } from "@/lib/types";

/**
 * Yönetim panelindeki bülten listesi.
 *
 * Arama, genel bülten indeksiyle aynı Türkçe duyarlı yardımcıyı kullanır
 * (lib/search.ts) — böylece iki ekranda farklı davranan iki arama olmaz.
 */
export function BulletinTable({
  bulletins,
  categories,
}: {
  bulletins: BulletinWithCategory[];
  categories: CategoryWithCount[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");

  const visible = useMemo(
    () =>
      bulletins.filter((bulletin) => {
        if (categoryId !== "all" && bulletin.category_id !== categoryId) return false;
        return matchesQuery(query, bulletin.bulletin_no, bulletin.subject, bulletin.category_name);
      }),
    [bulletins, query, categoryId],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[14rem] flex-1">
          <label className="sr-only" htmlFor="admin-bulten-ara">
            Bülten ara
          </label>
          <TextInput
            id="admin-bulten-ara"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bülten no veya konu ara…"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <FilterChip active={categoryId === "all"} onClick={() => setCategoryId("all")}>
            Tümü ({bulletins.length})
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              active={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Tablo geniş; kendi içinde yatay kayar, sayfa gövdesi kaymaz. */}
      <div className="mt-4 overflow-x-auto rounded-brand border border-tfs-grey bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-tfs-grey bg-tfs-grey-20">
            <tr className="text-[0.6875rem] tracking-[0.08em] text-tfs-dark-60 uppercase">
              <Th>Bülten no</Th>
              <Th>Konu</Th>
              <Th>Sekme</Th>
              <Th>Tarih</Th>
              <Th>Durum</Th>
              <Th className="text-right">İşlem</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tfs-grey-40">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-light text-tfs-dark-60">
                  {bulletins.length === 0
                    ? "Henüz bülten yüklenmedi."
                    : "Aramanızla eşleşen bülten bulunamadı."}
                </td>
              </tr>
            ) : (
              visible.map((bulletin) => (
                <tr key={bulletin.id} className="align-top hover:bg-tfs-grey-20">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-tfs-red">
                      {bulletin.bulletin_no}
                    </span>
                  </td>

                  <td className="max-w-sm px-4 py-3">
                    <Link
                      href={`/admin/bultenler/${bulletin.id}`}
                      className="font-medium text-tfs-dark hover:text-tfs-red"
                    >
                      {bulletin.subject}
                    </Link>
                    <span className="mt-0.5 block text-xs text-tfs-dark-60">
                      {formatFileSize(bulletin.file_size)} ·{" "}
                      {formatNumber(bulletin.download_count)} indirme
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-tfs-dark-80">{bulletin.category_name}</td>

                  <td className="px-4 py-3 text-xs whitespace-nowrap text-tfs-dark-80">
                    {formatDate(bulletin.published_date)}
                  </td>

                  <td className="px-4 py-3">
                    {bulletin.is_published ? (
                      <span className="inline-block rounded-brand bg-tfs-green/20 px-2 py-0.5 text-[0.6875rem] font-semibold text-tfs-dark">
                        Yayında
                      </span>
                    ) : (
                      <span className="inline-block rounded-brand bg-tfs-grey-40 px-2 py-0.5 text-[0.6875rem] font-semibold text-tfs-dark-60">
                        Taslak
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <a
                        href={`/api/dosya/${bulletin.id}`}
                        target="_blank"
                        rel="noopener"
                        className="rounded-brand border border-tfs-grey px-2 py-1 text-xs text-tfs-dark-80 hover:border-tfs-dark-20 hover:text-tfs-dark"
                      >
                        PDF
                      </a>

                      <Link
                        href={`/admin/bultenler/${bulletin.id}`}
                        className="rounded-brand border border-tfs-grey px-2 py-1 text-xs text-tfs-dark-80 hover:border-tfs-dark-20 hover:text-tfs-dark"
                      >
                        Düzenle
                      </Link>

                      <form action={togglePublishAction}>
                        <input type="hidden" name="id" value={bulletin.id} />
                        <SubmitButton
                          variant="secondary"
                          className="!px-2 !py-1 !text-xs !font-normal"
                        >
                          {bulletin.is_published ? "Yayından kaldır" : "Yayınla"}
                        </SubmitButton>
                      </form>

                      <form action={deleteBulletinAction}>
                        <input type="hidden" name="id" value={bulletin.id} />
                        <SubmitButton
                          variant="danger"
                          className="!px-2 !py-1 !text-xs !font-normal"
                          confirm={`"${bulletin.bulletin_no}" bültenini ve PDF dosyasını kalıcı olarak silmek istediğinize emin misiniz?`}
                        >
                          Sil
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs font-light text-tfs-dark-60">
        {formatNumber(visible.length)} / {formatNumber(bulletins.length)} bülten gösteriliyor.
      </p>
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-semibold ${className}`}>{children}</th>;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-brand border px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? "border-tfs-red bg-tfs-red-10 font-semibold text-tfs-red"
          : "border-tfs-grey bg-white text-tfs-dark-60 hover:border-tfs-dark-20 hover:text-tfs-dark"
      }`}
    >
      {children}
    </button>
  );
}
