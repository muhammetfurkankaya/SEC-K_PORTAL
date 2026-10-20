"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { matchesQuery } from "@/lib/search";

/** Öneri listesinde gösterilecek asgari bülten bilgisi. */
export type BulletinSuggestion = {
  id: number;
  bulletin_no: string;
  subject: string;
  category_name: string;
  category_slug: string;
};

/** Açılan listede en fazla kaç öneri gösterilsin. */
const MAX_SUGGESTIONS = 8;

/**
 * Ana sayfadaki bülten arama alanı.
 *
 * Yazdıkça eşleşen bültenler altta açılır; birini seçmek o bülteni doğrudan
 * okuma ekranında açar — "Ara" düğmesine basmak gerekmez. Düğme yine çalışır
 * ve tüm sonuçları arama sayfasında listeler.
 *
 * Arama Türkçe duyarlıdır (lib/search.ts): "ucak" yazan kullanıcı "Uçak"
 * geçen bültenleri de bulur.
 *
 * Form gerçek bir `action` taşıdığı için JavaScript çalışmasa da arama
 * yapılabilir; öneri listesi yalnızca bunun üstüne eklenen bir kolaylıktır.
 */
export function BulletinSearch({
  bulletins,
  submitLabel,
  tone = "light",
}: {
  bulletins: BulletinSuggestion[];
  /** Gönder düğmesinin yazısı — ayarlardan yönetilir. */
  submitLabel: string;
  /** koyu: hero altındaki koyu bandın üzerinde kullanılır. */
  tone?: "light" | "koyu";
}) {
  const dark = tone === "koyu";
  const router = useRouter();
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return bulletins
      .filter((b) => matchesQuery(trimmed, b.bulletin_no, b.subject, b.category_name))
      .slice(0, MAX_SUGGESTIONS);
  }, [bulletins, query]);

  const totalMatches = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return 0;
    return bulletins.filter((b) => matchesQuery(trimmed, b.bulletin_no, b.subject, b.category_name))
      .length;
  }, [bulletins, query]);

  const showList = open && query.trim().length >= 2;

  function openBulletin(item: BulletinSuggestion): void {
    setOpen(false);
    router.push(`/bultenler/${item.category_slug}?bulten=${item.id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (matches.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        if (next < 0) return matches.length - 1;
        if (next >= matches.length) return 0;
        return next;
      });
      return;
    }

    // Listeden bir öneri seçiliyse Enter onu açar; seçili değilse form
    // normal şekilde arama sayfasına gider.
    if (event.key === "Enter" && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      openBulletin(matches[activeIndex]);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        // Odak bileşenin dışına çıktıysa listeyi kapat; içindeki bir öneriye
        // geçtiyse açık kalsın.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <form action="/ara" method="get" role="search">
        <label htmlFor="q" className="sr-only">
          Tüm bültenlerde ara
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 ${
                dark ? "text-tfs-grey/70" : "text-tfs-dark-60"
              }`}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              id="q"
              name="q"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Tüm bültenlerde ara — bülten no veya konu"
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 && matches[activeIndex]
                  ? `${listId}-${matches[activeIndex].id}`
                  : undefined
              }
              className={`w-full rounded-brand border py-3 pr-4 pl-11 text-sm transition-colors focus:border-tfs-red focus:outline-none ${
                dark
                  ? "border-white/20 bg-white/[0.06] text-white placeholder:text-tfs-grey/60 focus:bg-white/[0.09]"
                  : "border-tfs-grey bg-white text-tfs-dark placeholder:text-tfs-dark-60"
              }`}
            />
          </div>
          <button
            type="submit"
            className={`rounded-brand px-6 py-3 text-sm font-semibold text-white transition-colors ${
              dark ? "bg-tfs-red hover:bg-[#a81a20]" : "bg-tfs-dark hover:bg-tfs-red"
            }`}
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {showList ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Arama önerileri"
          className="fade-in absolute z-30 mt-1 w-full overflow-hidden rounded-brand border border-tfs-grey bg-white shadow-brand-float sm:w-[calc(100%-5.5rem)]"
        >
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm font-light text-tfs-dark-60">
              “{query.trim()}” ile eşleşen bülten bulunamadı.
            </p>
          ) : (
            <>
              <ul className="max-h-80 divide-y divide-tfs-grey-40 overflow-y-auto">
                {matches.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      id={`${listId}-${item.id}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      // Odağın girdiden ayrılmasını engelliyoruz: aksi halde
                      // mousedown anında blur tetikleniyor, liste kapanıyor ve
                      // tıklama hiç bu düğmeye ulaşmıyor.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openBulletin(item)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        index === activeIndex ? "bg-tfs-red-10" : "hover:bg-tfs-grey-20"
                      }`}
                    >
                      <span className="placard-quiet">{item.bulletin_no}</span>
                      <span className="min-w-0 flex-1 text-sm text-tfs-dark">{item.subject}</span>
                      <span className="shrink-0 text-[0.625rem] font-semibold tracking-[0.08em] text-tfs-dark-60 uppercase">
                        {item.category_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {totalMatches > matches.length ? (
                <a
                  href={`/ara?q=${encodeURIComponent(query.trim())}`}
                  className="block border-t border-tfs-grey bg-tfs-grey-20 px-3 py-2 text-xs font-semibold text-tfs-red hover:bg-tfs-red-10"
                >
                  {totalMatches} sonucun tamamını gör →
                </a>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
