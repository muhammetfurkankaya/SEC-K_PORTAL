"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPhotoRoute } from "@/lib/routes";

/**
 * Üst bandın çerçevesi.
 *
 * Fotoğraflı sayfalarda (ana sayfa, bülten sekmeleri — lib/routes.ts) logo
 * şeridi ve sekmeler fotoğrafın ÜZERİNDE saydam durur; diğer sayfalarda koyu
 * şerit + beyaz sekme çubuğu. Yerleşim sunucuda çizildiği ve yolu bilmediği için bu karar
 * burada, istemcide veriliyor.
 *
 * Duyuru şeridi saydam düzende en üste alınıyor: fotoğrafın üzerinde
 * değil, akışta kalsın ki okunurluğu fotoğrafa bağlı olmasın.
 */
export function HeaderFrame({
  bar,
  nav,
  announcement,
}: {
  bar: ReactNode;
  nav: ReactNode;
  announcement: ReactNode;
}) {
  const overlay = isPhotoRoute(usePathname());

  if (!overlay) {
    return (
      <header>
        {/* Kılavuz s.51: koyu zemin (#1D252D) + beyaz logo */}
        <div className="bg-tfs-dark print-hidden">{bar}</div>
        <div className="brand-seam print-hidden" aria-hidden="true" />
        {nav}
        {announcement}
      </header>
    );
  }

  return (
    // Akıştaki yüksekliği yalnızca duyuru şeridi kadar; logo ve sekmeler
    // hemen altından başlayan hero'nun üzerine biniyor.
    <header className="relative z-30">
      {announcement}
      <div className="absolute inset-x-0 top-full print-hidden">
        {bar}
        {nav}
      </div>
    </header>
  );
}
