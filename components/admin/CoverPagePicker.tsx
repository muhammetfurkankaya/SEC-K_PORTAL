"use client";

import { useEffect, useRef, useState } from "react";
import { COVER_WIDTH, loadPdf, renderPageJpeg, type PdfDoc } from "@/lib/pdfjs-client";

/** Şeritte gösterilecek en fazla sayfa — bültenler genelde birkaç sayfa. */
const MAX_PAGES = 30;
const THUMB_WIDTH = 120;

export type CoverStatus = "hazirlaniyor" | "hazir" | "hata";

/**
 * Kapak sayfası seçici.
 *
 * PDF'in sayfaları küçük görseller hâlinde dizilir; tıklanan sayfa
 * ana sayfadaki kapaklı kartta (ızgara görünümü) gösterilecek görsel olur.
 * Varsayılan 1. sayfa. Her şey tarayıcıda olur: seçilen sayfa küçük bir
 * JPEG'e çevrilip `onCover` ile forma verilir, sunucu görüntü işlemez.
 */
export function CoverPagePicker({
  source,
  onCover,
  onStatus,
}: {
  /** Yeni seçilen PDF'in içeriği ya da mevcut PDF'in adresi. */
  source: ArrayBuffer | string;
  onCover: (cover: { blob: Blob; page: number } | null) => void;
  onStatus: (status: CoverStatus) => void;
}) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Geri çağrılar her çizimde yeni olabilir; etkiler onlara bağlanmasın.
  const callbacks = useRef({ onCover, onStatus });
  callbacks.current = { onCover, onStatus };

  // ————— Belgeyi aç, küçük görselleri sırayla çiz —————
  useEffect(() => {
    let cancelled = false;
    let task: Awaited<ReturnType<typeof loadPdf>> | null = null;
    const urls: string[] = [];

    setDoc(null);
    setThumbs([]);
    setTotal(0);
    setSelected(1);
    setFailed(false);
    callbacks.current.onStatus("hazirlaniyor");

    (async () => {
      try {
        task = await loadPdf(source);
        const loaded = await task.promise;
        if (cancelled) return;
        setDoc(loaded);
        setTotal(loaded.numPages);

        for (let n = 1; n <= Math.min(loaded.numPages, MAX_PAGES); n++) {
          const blob = await renderPageJpeg(loaded, n, THUMB_WIDTH, 0.7);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setThumbs((current) => [...current, url]);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          callbacks.current.onStatus("hata");
          callbacks.current.onCover(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [source]);

  // ————— Seçilen sayfadan kapağı üret —————
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let url: string | null = null;
    callbacks.current.onStatus("hazirlaniyor");

    renderPageJpeg(doc, selected, COVER_WIDTH)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
        callbacks.current.onCover({ blob, page: selected });
        callbacks.current.onStatus("hazir");
      })
      .catch(() => {
        if (cancelled) return;
        callbacks.current.onCover(null);
        callbacks.current.onStatus("hata");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, selected]);

  if (failed) {
    return (
      <p className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-3 text-xs text-tfs-dark-80">
        PDF'in sayfaları okunamadı; bülten yine kaydedilir, kartta yazılı kapak görünür.
      </p>
    );
  }

  return (
    <div className="rounded-brand border border-tfs-grey bg-tfs-grey-20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-tfs-dark">
          Kapak sayfası
          <span className="ml-1.5 font-light text-tfs-dark-60">
            — ana sayfadaki kapaklı kartta (ızgara görünümü) gösterilecek sayfa
          </span>
        </p>
        {total > MAX_PAGES ? (
          <p className="text-[0.6875rem] text-tfs-dark-60">İlk {MAX_PAGES} sayfa gösteriliyor</p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-4">
        {/* Seçilen kapak — kartta göründüğü oranda. */}
        <div className="hidden w-28 shrink-0 sm:block">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme */
            <img
              src={preview}
              alt={`Kapak: ${selected}. sayfa`}
              className="aspect-[1/1.414] w-full border border-tfs-grey bg-white object-cover object-top shadow-sm"
            />
          ) : (
            <div className="aspect-[1/1.414] w-full animate-pulse border border-tfs-grey bg-white" />
          )}
          <p className="mt-1 text-center text-[0.6875rem] text-tfs-dark-60">{selected}. sayfa</p>
        </div>

        <div
          role="radiogroup"
          aria-label="Kapak sayfası"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2"
        >
          {thumbs.length === 0 ? (
            <p className="self-center text-xs text-tfs-dark-60">Sayfalar hazırlanıyor…</p>
          ) : null}
          {thumbs.map((url, index) => {
            const page = index + 1;
            const active = page === selected;
            return (
              <button
                key={url}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${page}. sayfa`}
                onClick={() => setSelected(page)}
                className={`w-20 shrink-0 rounded-brand border-2 bg-white p-0.5 text-center transition-colors ${
                  active ? "border-tfs-red" : "border-transparent hover:border-tfs-dark-20"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme */}
                <img src={url} alt="" className="aspect-[1/1.414] w-full object-cover object-top" />
                <span
                  className={`mt-0.5 block text-[0.6875rem] ${
                    active ? "font-semibold text-tfs-red" : "text-tfs-dark-60"
                  }`}
                >
                  {page}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
