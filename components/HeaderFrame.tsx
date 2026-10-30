"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isPhotoRoute } from "@/lib/routes";

/**
 * Üst menü: TEK SATIR — solda logo, ortada sekmeler, sağda yönetim simgesi.
 * 1280 px'ten dar ekranda sekmeler logonun altına, yatay kaydırılabilir
 * şeride iner (altı sekme daha dar ekranda tek satıra sığmıyor).
 *
 * Fotoğraflı sayfalarda (ana sayfa, bülten sekmeleri — lib/routes.ts) menü
 * fotoğrafın ÜZERİNDE saydam durur; diğer sayfalarda koyu şerittir.
 *
 * Sabit menü açıksa (`sticky`) menü kaydırırken ekranın üstünde kalır:
 * kaydırmaya başlayınca koyu buzlu zemine geçer (`data-kaydirildi`), biraz
 * daha kaydırınca incelir (`data-ince`). Görünüm globals.css'te (.site-bar).
 *
 * Neden `sticky` ve 0 yükseklikli kap: menü yerleşimin doğrudan çocuğu
 * olarak sayfa boyunca yapışkan kalıyor; fotoğraflı sayfada kap akışta yer
 * kaplamıyor, menü hero'nun üzerine biniyor. Duyuru şeridi menünün üstünde
 * akışta kalır, okunurluğu fotoğrafa bağlı olmaz.
 */
export function HeaderFrame({
  logo,
  nav,
  admin,
  announcement,
  sticky,
  gridClass,
}: {
  logo: ReactNode;
  nav: ReactNode;
  admin: ReactNode;
  announcement: ReactNode;
  sticky: boolean;
  /** Geniş ekrandaki sütun düzeni — sekmelerin hizasına göre (SiteHeader). */
  gridClass: string;
}) {
  const pathname = usePathname();
  const overlay = isPhotoRoute(pathname);
  const [scroll, setScroll] = useState({ moved: false, thin: false });

  useEffect(() => {
    if (!sticky) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const next = { moved: y > 24, thin: y > 160 };
      setScroll((current) =>
        current.moved === next.moved && current.thin === next.thin ? current : next,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sticky, pathname]);

  const bar = (
    <header
      className="site-bar print-hidden"
      data-overlay={overlay ? "" : undefined}
      data-kaydirildi={sticky && scroll.moved ? "" : undefined}
      data-ince={sticky && scroll.thin ? "" : undefined}
    >
      <div
        className={`mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-6 px-4 sm:px-6 lg:px-8 ${gridClass}`}
      >
        <div className="site-bar-logo row-start-1 flex min-w-0 items-center justify-self-start">
          {logo}
        </div>
        <div className="col-span-2 row-start-2 -mx-4 min-w-0 sm:-mx-6 lg:-mx-8 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mx-0">
          {nav}
        </div>
        <div className="row-start-1 justify-self-end xl:col-start-3">{admin}</div>
      </div>
    </header>
  );

  return (
    <>
      {announcement}
      {overlay ? (
        <div className={`${sticky ? "sticky" : "relative"} top-0 z-40 h-0`}>
          <div className="absolute inset-x-0 top-0">{bar}</div>
        </div>
      ) : (
        <div className={`${sticky ? "sticky top-0" : "relative"} z-40`}>
          {bar}
          {/* Kılavuz s.51: koyu şeridin altında kurumsal kırmızı ayırıcı. */}
          <div className="brand-seam print-hidden" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
