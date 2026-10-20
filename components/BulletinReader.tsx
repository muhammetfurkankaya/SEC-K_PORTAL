"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, formatFileSize, formatNumber } from "@/lib/format";
import { compareBulletinNo, matchesQuery } from "@/lib/search";
import { SORT_LABELS, SORT_KEYS, type SortKey } from "@/lib/settings-schema";
import type { BulletinWithCategory } from "@/lib/types";

type BulletinReaderProps = {
  bulletins: BulletinWithCategory[];
  /** Kapalıysa satıra tıklamak doğrudan indirir (ayarlardan yönetilir). */
  previewEnabled: boolean;
  showDownloadCount: boolean;
  defaultSort: SortKey;
  /** ?bulten=<id> ile gelen bülten — paylaşılan bağlantıyı açar. */
  initialSelectedId?: number;
  /** Arama sayfasından gelen ilk arama terimi. */
  initialQuery?: string;
  /** Sekmeler arası listelerde (arama sonuçları) bölüm adını göster. */
  showCategory?: boolean;
  /** Liste boşken gösterilecek metin. */
  emptyNote?: string;
  /**
   * Sunucunun bugün tarihi ('YYYY-MM-DD').
   *
   * "Yeni" etiketini burada `Date.now()` ile hesaplamıyoruz: bu bileşen hem
   * sunucuda hem tarayıcıda render edildiği için iki taraf farklı sonuç
   * verirse hidrasyon uyuşmazlığı oluşur. Tarih tek kaynaktan gelir.
   */
  todayIso: string;
};

/** Son 7 gün içinde yayımlananlar "Yeni" işaretlenir. */
function isRecent(publishedDate: string, todayIso: string): boolean {
  const toDays = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    return Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86_400_000;
  };

  const published = toDays(publishedDate);
  const today = toDays(todayIso);
  if (published === null || today === null) return false;

  const age = today - published;
  return age >= 0 && age <= 7;
}

function sortBulletins(list: BulletinWithCategory[], sort: SortKey): BulletinWithCategory[] {
  const sorted = [...list];
  switch (sort) {
    case "tarih-eski":
      sorted.sort((a, b) => a.published_date.localeCompare(b.published_date));
      break;
    case "no-artan":
      sorted.sort((a, b) => compareBulletinNo(a.bulletin_no, b.bulletin_no));
      break;
    case "no-azalan":
      sorted.sort((a, b) => compareBulletinNo(b.bulletin_no, a.bulletin_no));
      break;
    default:
      sorted.sort((a, b) => b.published_date.localeCompare(a.published_date));
  }
  return sorted;
}

/**
 * Bülten okuma ekranı — solda aranabilir indeks, sağda seçilen bültenin PDF'i.
 *
 * Satıra tıklamak bülteni **açar, indirmez**; indirme yalnızca açık "İndir"
 * düğmeleriyle yapılır. Seçim adres çubuğuna `?bulten=<id>` olarak yazılır,
 * böylece bir bültenin bağlantısı paylaşılabilir; bu yazma
 * `history.replaceState` ile yapıldığı için sayfa yeniden yüklenmez.
 */
export function BulletinReader({
  bulletins,
  previewEnabled,
  showDownloadCount,
  defaultSort,
  initialSelectedId,
  initialQuery = "",
  showCategory = false,
  emptyNote = "Bu bölümde henüz yayımlanmış bülten yok.",
  todayIso,
}: BulletinReaderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(defaultSort);

  const visible = useMemo(() => {
    const filtered = bulletins.filter((b) =>
      matchesQuery(query, b.bulletin_no, b.subject, b.description),
    );
    return sortBulletins(filtered, sort);
  }, [bulletins, query, sort]);

  const [selectedId, setSelectedId] = useState<number | null>(
    initialSelectedId ?? bulletins[0]?.id ?? null,
  );
  // Dar ekranda liste ve önizleme aynı anda sığmaz: önizleme ancak kullanıcı
  // bir bülten seçtiğinde öne gelir.
  const [mobileOpen, setMobileOpen] = useState(Boolean(initialSelectedId));

  // Seçim süzülmüş liste üzerinden çözülür: arama sonucu dışında kalan bir
  // bülten önizlemede durmasın. Bu yüzden filtre daraldığında önizleme
  // görünen ilk bültene kayar.
  const selected = visible.find((b) => b.id === selectedId) ?? visible[0] ?? null;

  // Seçim değiştikçe adres çubuğunu güncelle (yeniden yükleme olmadan).
  useEffect(() => {
    if (!previewEnabled || !selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set("bulten", String(selected.id));
    window.history.replaceState(null, "", url);
  }, [selected, previewEnabled]);

  function open(bulletin: BulletinWithCategory): void {
    setSelectedId(bulletin.id);
    setMobileOpen(true);
  }

  if (bulletins.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-14 text-center text-sm font-light text-tfs-dark-60">
          {emptyNote}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8 ${
        previewEnabled ? "lg:grid lg:grid-cols-[21rem_1fr]" : ""
      }`}
    >
      {/* ————————————— İndeks ————————————— */}
      <aside
        className={`${
          previewEnabled && mobileOpen ? "hidden lg:block" : "block"
        } lg:sticky lg:top-4 lg:self-start`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-[0.12em] text-tfs-red uppercase">
            Bülten indeksi
          </h2>
          <span className="tnum text-xs text-tfs-dark-60">
            {formatNumber(visible.length)} / {formatNumber(bulletins.length)}
          </span>
        </div>

        <label className="mt-2 block">
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
          {SORT_KEYS.map((key) => (
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

        <div className="mt-3 max-h-[34rem] overflow-y-auto rounded-brand border border-tfs-grey">
          {visible.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs font-light text-tfs-dark-60">
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
            <ul className="divide-y divide-tfs-grey-40">
              {visible.map((bulletin) => (
                <li key={bulletin.id}>
                  <IndexRow
                    bulletin={bulletin}
                    isActive={previewEnabled && selected?.id === bulletin.id}
                    previewEnabled={previewEnabled}
                    showCategory={showCategory}
                    todayIso={todayIso}
                    onOpen={() => open(bulletin)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-2 text-[0.6875rem] font-light text-tfs-dark-60">
          {previewEnabled
            ? "Bülten satırına tıklamak onu yanda açar. İndirmek için ↓ simgesini kullanın."
            : "Bülten satırına tıklamak PDF'i indirir."}
        </p>
      </aside>

      {/* ————————————— Önizleme ————————————— */}
      {previewEnabled ? (
        <section
          className={`${mobileOpen ? "block" : "hidden lg:block"} min-w-0`}
          aria-label="Bülten önizlemesi"
        >
          {selected ? (
            <Preview
              bulletin={selected}
              showDownloadCount={showDownloadCount}
              onBack={() => setMobileOpen(false)}
            />
          ) : (
            <p className="rounded-brand border border-dashed border-tfs-grey bg-tfs-grey-20 px-4 py-16 text-center text-sm font-light text-tfs-dark-60">
              Okumak için soldaki listeden bir bülten seçin.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

/** İndeks satırı — açma düğmesi ve ayrı indirme bağlantısı. */
function IndexRow({
  bulletin,
  isActive,
  previewEnabled,
  showCategory,
  todayIso,
  onOpen,
}: {
  bulletin: BulletinWithCategory;
  isActive: boolean;
  previewEnabled: boolean;
  showCategory: boolean;
  todayIso: string;
  onOpen: () => void;
}) {
  const label = `${bulletin.bulletin_no} — ${bulletin.subject}`;

  return (
    <div
      className={`flex items-stretch gap-1 transition-colors ${
        isActive ? "bg-tfs-red-10" : "hover:bg-tfs-grey-20"
      }`}
    >
      {previewEnabled ? (
        <button
          type="button"
          onClick={onOpen}
          aria-current={isActive ? "true" : undefined}
          title={`${label} — okumak için tıklayın`}
          className="min-w-0 flex-1 px-3 py-2.5 text-left"
        >
          <RowBody bulletin={bulletin} showCategory={showCategory} todayIso={todayIso} />
        </button>
      ) : (
        <a
          href={`/api/dosya/${bulletin.id}?mod=indir`}
          title={`${label} — indirmek için tıklayın`}
          className="min-w-0 flex-1 px-3 py-2.5"
        >
          <RowBody bulletin={bulletin} showCategory={showCategory} todayIso={todayIso} />
        </a>
      )}

      {previewEnabled ? (
        <a
          href={`/api/dosya/${bulletin.id}?mod=indir`}
          title={`${label} — indir`}
          aria-label={`${label} bültenini indir`}
          className="flex w-9 shrink-0 items-center justify-center border-l border-tfs-grey-40 text-tfs-dark-60 transition-colors hover:bg-tfs-red hover:text-white"
        >
          <DownloadIcon />
        </a>
      ) : null}
    </div>
  );
}

function RowBody({
  bulletin,
  showCategory,
  todayIso,
}: {
  bulletin: BulletinWithCategory;
  showCategory: boolean;
  todayIso: string;
}) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        {/* İmza öğesi: bülten numarası plaka olarak */}
        <span className="placard-quiet">{bulletin.bulletin_no}</span>
        <span className="tnum shrink-0 text-[0.6875rem] text-tfs-dark-60">
          {formatDate(bulletin.published_date)}
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xs leading-snug text-tfs-dark">{bulletin.subject}</span>
        {isRecent(bulletin.published_date, todayIso) ? (
          <span className="shrink-0 bg-tfs-green px-1 py-px text-[0.5625rem] font-semibold tracking-wide text-tfs-dark uppercase">
            Yeni
          </span>
        ) : null}
      </span>
      {showCategory ? (
        <span className="mt-1 block text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
          {bulletin.category_name}
        </span>
      ) : null}
    </>
  );
}

/** Seçilen bültenin başlığı ve gömülü PDF'i. */
function Preview({
  bulletin,
  showDownloadCount,
  onBack,
}: {
  bulletin: BulletinWithCategory;
  showDownloadCount: boolean;
  onBack: () => void;
}) {
  return (
    <div className="fade-in flex h-full flex-col" key={bulletin.id}>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-tfs-red lg:hidden"
      >
        <span aria-hidden="true">←</span> Listeye dön
      </button>

      <div className="overflow-hidden rounded-brand border border-tfs-grey bg-white">
        {/* Doküman künyesi + eylemler.

            Çubuk KOYU: altındaki tarayıcı PDF görüntüleyicisinin kendi gri
            araç çubuğu biçimlendirilemiyor. Bizim çubuğumuz da açık gri
            olduğunda iki gri bant üst üste biniyor ve hiçbiri "bu sayfanın
            düğmeleri" gibi okunmuyordu. Koyu zemin ikisini ayırıyor; indirme
            ve yeni sekme düğmeleri ekranın en ağır öğesi oluyor.

            Künye de sadeleşti: birinci satır plaka + konu, ikinci satır
            sessiz künye bilgisi. Önceden hepsi tek satırda yarışıyordu. */}
        <div className="sticky top-0 z-10 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 bg-tfs-dark px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="placard text-sm">{bulletin.bulletin_no}</span>
              <h2 className="min-w-0 text-base font-semibold text-white sm:text-lg">
                {bulletin.subject}
              </h2>
            </div>
            <p className="tnum mt-1.5 text-[0.6875rem] text-tfs-grey/70">
              {formatDate(bulletin.published_date)} · {formatFileSize(bulletin.file_size)}
              {showDownloadCount
                ? ` · ${formatNumber(bulletin.download_count)} indirme`
                : ""}
            </p>
          </div>

          {/* Dar ekranda iki eşit sütun: düğmeler asla kırpılmaz. */}
          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <a
              href={`/api/dosya/${bulletin.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-1.5 rounded-brand border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Yeni sekmede aç ↗
            </a>
            <a
              href={`/api/dosya/${bulletin.id}?mod=indir`}
              className="inline-flex items-center justify-center gap-1.5 rounded-brand bg-tfs-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a81a20]"
            >
              <DownloadIcon />
              PDF indir
            </a>
          </div>
        </div>

        {bulletin.description ? (
          <p className="border-b border-tfs-grey-40 px-4 py-3 text-sm font-light text-tfs-dark-80">
            {bulletin.description}
          </p>
        ) : null}

        <div className="bg-tfs-grey-20 p-2">
          <iframe
            // key: bülten değişince görüntüleyici baştan yüklenir.
            key={bulletin.id}
            src={`/api/dosya/${bulletin.id}`}
            title={`${bulletin.bulletin_no} — ${bulletin.subject}`}
            className="h-[70vh] min-h-[26rem] w-full border border-tfs-grey bg-white"
          />
        </div>
      </div>

      <p className="mt-2 text-xs font-light text-tfs-dark-60">
        PDF görüntülenemiyorsa “PDF indir” düğmesini kullanabilirsiniz.
      </p>
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
