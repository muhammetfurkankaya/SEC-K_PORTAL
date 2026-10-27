"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { loadPdf } from "@/lib/pdfjs-client";

/**
 * Yalnızca görüntüleme amaçlı PDF okuyucu.
 *
 * Tarayıcının kendi PDF görüntüleyicisi (Chrome/Edge) çizim, vurgu, not ve
 * form doldurma araçlarıyla geliyor ve bunlar bir iframe'den kapatılamıyor.
 * Burada sayfalar pdf.js ile düz <canvas>'a çiziliyor: metin katmanı,
 * etkileşimli not/form katmanı YOK. Kullanıcı yalnızca bakar, yakınlaştırır,
 * sayfalar arasında gezinir.
 *
 * pdf.js'in yüklenmesi lib/pdfjs-client.ts'te.
 */

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STEPS = [0.25, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/** Tek bir tuvalin en fazla piksel sayısı — eski makinelerde bellek taşmasın. */
const MAX_CANVAS_PIXELS = 16_777_216;

/** Sayfalar arası boşluk (px) — sığdırma hesabında da kullanılıyor. */
const PAGE_GAP = 12;
const PADDING = 12;

type Fit = "genislik" | "sayfa" | null;

type PageSize = { width: number; height: number };

export function PdfViewer({
  src,
  title,
  downloadHref,
  downloadLabel,
  className = "",
  initialFit = "genislik",
}: {
  /** PDF'in adresi (aynı kaynak). */
  src: string;
  title: string;
  downloadHref?: string;
  downloadLabel?: string;
  /** Kaydırma alanının yüksekliği gibi dış ölçüler. */
  className?: string;
  initialFit?: "genislik" | "sayfa";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [error, setError] = useState(false);
  const [fit, setFit] = useState<Fit>(initialFit);
  const [scale, setScale] = useState(1);
  const [current, setCurrent] = useState(1);

  // ————— Belgeyi yükle —————
  useEffect(() => {
    let cancelled = false;
    // Yükleme görevi: destroy() hem yarım kalan indirmeyi hem worker'ı kapatır.
    let task: { destroy: () => Promise<void> } | null = null;
    setDoc(null);
    setSizes([]);
    setError(false);
    setCurrent(1);

    (async () => {
      try {
        const loading = await loadPdf(src);
        task = loading;
        const loaded = await loading.promise;
        if (cancelled) {
          void loading.destroy();
          return;
        }

        // Tüm sayfaların ölçüsünü baştan al: yer tutucular doğru boyda
        // çizilsin, kaydırma çubuğu sayfalar yüklendikçe zıplamasın.
        const all: PageSize[] = [];
        for (let n = 1; n <= loaded.numPages; n++) {
          const page = await loaded.getPage(n);
          const viewport = page.getViewport({ scale: 1 });
          all.push({ width: viewport.width, height: viewport.height });
        }
        if (cancelled) return;
        setSizes(all);
        setDoc(loaded);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [src]);

  // ————— Sığdırma —————
  const computeFit = useCallback(
    (mode: Exclude<Fit, null>): number => {
      const box = scrollRef.current;
      const first = sizes[0];
      if (!box || !first) return 1;
      const widest = Math.max(...sizes.map((size) => size.width));
      const byWidth = (box.clientWidth - PADDING * 2) / widest;
      if (mode === "genislik") return clamp(byWidth);
      const byHeight = (box.clientHeight - PADDING * 2) / first.height;
      return clamp(Math.min(byWidth, byHeight));
    },
    [sizes],
  );

  useEffect(() => {
    if (!fit || sizes.length === 0) return;
    const apply = () => setScale(computeFit(fit));
    apply();
    const box = scrollRef.current;
    if (!box) return;
    const observer = new ResizeObserver(apply);
    observer.observe(box);
    return () => observer.disconnect();
  }, [fit, sizes, computeFit]);

  // ————— Yakınlaştırma —————
  const zoom = useCallback((direction: 1 | -1) => {
    setFit(null);
    setScale((value) => {
      if (direction > 0) return STEPS.find((step) => step > value + 0.001) ?? MAX_SCALE;
      return [...STEPS].reverse().find((step) => step < value - 0.001) ?? MIN_SCALE;
    });
  }, []);

  // Ctrl + tekerlek: tarayıcının sayfa yakınlaştırması yerine belgeyi büyüt.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1 : -1);
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [zoom]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoom(1);
    } else if (event.key === "-") {
      event.preventDefault();
      zoom(-1);
    } else if (event.key === "0") {
      event.preventDefault();
      setFit("genislik");
    }
  }

  // ————— Hangi sayfadayız —————
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || sizes.length === 0) return;
    const onScroll = () => {
      const middle = box.scrollTop + box.clientHeight / 3;
      const pages = box.querySelectorAll<HTMLElement>("[data-sayfa]");
      let found = 1;
      pages.forEach((element) => {
        if (element.offsetTop <= middle) found = Number(element.dataset.sayfa);
      });
      setCurrent(found);
    };
    onScroll();
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, [sizes, scale]);

  function goTo(page: number) {
    const box = scrollRef.current;
    const target = box?.querySelector<HTMLElement>(`[data-sayfa="${page}"]`);
    if (box && target) box.scrollTo({ top: target.offsetTop - PADDING });
  }

  const total = sizes.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 text-sm text-ink">
        <div className="flex items-center gap-1">
          <ToolButton
            label="Önceki sayfa"
            disabled={current <= 1}
            onClick={() => goTo(current - 1)}
          >
            ‹
          </ToolButton>
          <span
            className="tnum min-w-[4.5rem] text-center text-xs text-ink-soft"
            aria-live="polite"
          >
            {total > 0 ? `${current} / ${total}` : "…"}
          </span>
          <ToolButton
            label="Sonraki sayfa"
            disabled={current >= total}
            onClick={() => goTo(current + 1)}
          >
            ›
          </ToolButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolButton label="Küçült" disabled={scale <= MIN_SCALE} onClick={() => zoom(-1)}>
            −
          </ToolButton>
          <span className="tnum min-w-[3.5rem] text-center text-xs font-semibold">
            %{Math.round(scale * 100)}
          </span>
          <ToolButton label="Büyüt" disabled={scale >= MAX_SCALE} onClick={() => zoom(1)}>
            +
          </ToolButton>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          <FitButton active={fit === "genislik"} onClick={() => setFit("genislik")}>
            Genişliğe sığdır
          </FitButton>
          <FitButton active={fit === "sayfa"} onClick={() => setFit("sayfa")}>
            Sayfayı sığdır
          </FitButton>
        </div>
      </div>

      {/* Sayfalar */}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="document"
        aria-label={`${title} — PDF görüntüleyici. Büyütmek için +, küçültmek için − tuşu.`}
        onKeyDown={onKeyDown}
        // Sağ tık menüsü ("resmi farklı kaydet" vb.) ve sürükleme kapalı:
        // okuyucu yalnızca görüntüleme içindir.
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        className={`min-h-0 overflow-auto bg-surface-3 outline-none select-none focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
        style={{ padding: PADDING }}
      >
        {error ? (
          <div className="mx-auto max-w-md rounded-brand border border-line bg-surface p-6 text-center text-sm text-ink-soft">
            <p className="font-semibold text-ink">PDF görüntülenemedi.</p>
            <p className="mt-1 font-light">
              Dosya bozuk olabilir ya da tarayıcınız desteklemiyor olabilir.
            </p>
            {downloadHref ? (
              <a
                href={downloadHref}
                className="mt-4 inline-flex rounded-brand bg-tfs-red px-4 py-2 text-sm font-semibold text-white hover:bg-[#a81a20]"
              >
                {downloadLabel ?? "PDF indir"}
              </a>
            ) : null}
          </div>
        ) : total === 0 ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center text-sm font-light text-ink-faint">
            PDF yükleniyor…
          </div>
        ) : (
          <div className="flex w-max min-w-full flex-col items-center" style={{ gap: PAGE_GAP }}>
            {sizes.map((size, index) => (
              <PdfPage
                key={index}
                doc={doc}
                number={index + 1}
                size={size}
                scale={scale}
                root={scrollRef}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tek bir sayfa: görünüme yaklaşınca çizilir, uzaklaşınca tuvali boşaltılır
 * — 40 sayfalık bir bülten bile belleği şişirmez.
 */
function PdfPage({
  doc,
  number,
  size,
  scale,
  root,
}: {
  doc: PDFDocumentProxy | null;
  number: number;
  size: PageSize;
  scale: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: root.current,
      rootMargin: "600px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    if (!visible) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;

    (async () => {
      const page = await doc.getPage(number);
      if (cancelled) return;

      // Yüksek çözünürlüklü ekranlarda keskin; ama tuval sınırını aşmasın.
      let ratio = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale });
      const pixels = base.width * base.height * ratio * ratio;
      if (pixels > MAX_CANVAS_PIXELS)
        ratio = Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height));
      const viewport = page.getViewport({ scale: scale * ratio });

      // Önce ayrı bir tuvale çiz, sonra göster: yakınlaştırmada sayfa bir
      // anlığına beyaz kalmasın.
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.floor(viewport.width);
      offscreen.height = Math.floor(viewport.height);

      task = page.render({ canvas: offscreen, viewport });
      try {
        await task.promise;
      } catch {
        return; // iptal edildi
      }
      if (cancelled) return;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      canvas.getContext("2d")?.drawImage(offscreen, 0, 0);
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, scale, visible]);

  const width = Math.floor(size.width * scale);
  const height = Math.floor(size.height * scale);

  return (
    <div
      ref={wrapperRef}
      data-sayfa={number}
      className="relative shrink-0 bg-white shadow-brand-raised"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`Sayfa ${number}`}
        className="block size-full"
        style={{ width, height }}
      />
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));
}

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-brand border border-line text-base leading-none text-ink transition-colors hover:border-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}

function FitButton({
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
      aria-pressed={active}
      onClick={onClick}
      className={`hidden rounded-brand border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors sm:inline-flex ${
        active
          ? "border-accent bg-accent-wash font-semibold text-accent-ink"
          : "border-line text-ink-soft hover:border-accent hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
