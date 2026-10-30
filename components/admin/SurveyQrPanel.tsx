"use client";

import Link from "next/link";
import { useState } from "react";

type SurveyQrPanelProps = {
  surveyId: number;
  title: string;
  url: string;
  pngDataUrl: string;
  svg: string;
  isActive: boolean;
};

/**
 * Anketin QR kodu ve paylaşım bağlantısı.
 *
 * QR sunucuda üretilir (lib/qr.ts); bu bileşen yalnızca gösterim, indirme
 * ve bağlantı kopyalama işlerini yapar.
 */
export function SurveyQrPanel({
  surveyId,
  title,
  url,
  pngDataUrl,
  svg,
  isActive,
}: SurveyQrPanelProps) {
  const [copied, setCopied] = useState(false);

  // Dosya adında Türkçe/özel karakter olmaması için sadeleştiriyoruz.
  const fileBase = `anket-qr-${surveyId}`;
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Pano izni yoksa kullanıcı adresi elle kopyalayabilir.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-brand border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase">
          QR Kod ve Bağlantı
        </h2>
        {isActive ? (
          <span className="rounded-brand bg-tfs-green/20 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">
            Açık
          </span>
        ) : (
          <span className="rounded-brand bg-surface-3 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-faint">
            Kapalı
          </span>
        )}
      </div>

      <div className="p-4">
        {!isActive ? (
          <p className="mb-3 rounded-brand border border-line bg-surface-2 px-3 py-2 text-xs text-ink-soft">
            Anket kapalı olduğu için QR kodu okutan kullanıcılar formu göremez. Yayınladıktan sonra
            bu kod çalışır.
          </p>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- sunucuda
            üretilen data URL; Next görüntü optimizasyonu uygulanamaz. */}
        <img
          src={pngDataUrl}
          alt={`${title} anketinin QR kodu`}
          className="mx-auto block size-48 rounded-brand border border-line"
        />

        <div className="mt-3">
          <span className="block text-xs font-semibold text-ink">Anket bağlantısı</span>
          <p className="mt-1 truncate rounded-brand bg-surface-2 px-2 py-1.5 font-mono text-[0.6875rem] text-ink-soft">
            {url}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-brand border border-line px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-tfs-red"
          >
            {copied ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}
          </button>

          <Link
            href={url}
            target="_blank"
            rel="noopener"
            className="rounded-brand border border-line px-3 py-2 text-center text-xs font-semibold text-ink transition-colors hover:border-tfs-red"
          >
            Formu aç ↗
          </Link>

          <a
            href={pngDataUrl}
            download={`${fileBase}.png`}
            className="rounded-brand border border-line px-3 py-2 text-center text-xs font-semibold text-ink transition-colors hover:border-tfs-red"
          >
            PNG indir
          </a>

          <a
            href={svgDataUrl}
            download={`${fileBase}.svg`}
            className="rounded-brand border border-line px-3 py-2 text-center text-xs font-semibold text-ink transition-colors hover:border-tfs-red"
          >
            SVG indir
          </a>
        </div>

        <Link
          href={`/admin/anketler/${surveyId}/qr`}
          className="mt-2 block rounded-brand border border-line-strong bg-surface-3 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-tfs-red"
        >
          Asılacak afişi yazdır
        </Link>
      </div>
    </div>
  );
}
