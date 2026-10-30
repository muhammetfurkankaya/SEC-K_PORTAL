"use client";

import { useEffect, useRef } from "react";

/**
 * Kaydırdıkça paralaks: sayfa aşağı kaydırıldıkça hero yazısı görselden
 * yavaş kayıp soluklaşır, görsel hafifçe yakınlaşır.
 *
 * Kendisi hiçbir şey çizmez; bulunduğu hero'daki `data-paralaks="metin"` ve
 * `data-paralaks="gorsel"` öğelerine yalnızca transform/opacity verir.
 * Kaydırma dinleyicisi pasif ve kare başına bir kez çalışır; hero ekrandan
 * çıkınca hesap yapılmaz. Ziyaretçinin cihazında hareketler kapalıysa
 * (prefers-reduced-motion) hiç bağlanmaz.
 */
export function HeroParallax() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = anchor.current?.closest("section");
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const text = hero.querySelector<HTMLElement>('[data-paralaks="metin"]');
    const image = hero.querySelector<HTMLElement>('[data-paralaks="gorsel"]');
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const height = hero.offsetHeight;
      if (y > height) return; // hero ekran dışında
      if (text) {
        text.style.transform = y > 0 ? `translateY(${y * 0.45}px)` : "";
        text.style.opacity = y > 0 ? String(Math.max(0, 1 - y / (height * 0.55))) : "";
      }
      if (image) {
        image.style.transform =
          y > 0 ? `translateY(${y * 0.2}px) scale(${1 + (y / height) * 0.08})` : "";
      }
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
  }, []);

  return <span ref={anchor} hidden />;
}
