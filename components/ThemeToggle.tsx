"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

/**
 * Gece / gündüz düğmesi — üst koyu bantta.
 *
 * Bant her iki temada da koyu olduğu için düğmenin kendi renkleri sabit.
 * Seçim ziyaretçinin tarayıcısında saklanıyor; ilk boyamadan önce
 * <head>'deki betik onu uyguluyor (lib/theme.ts), bu bileşen yalnızca
 * değiştirmeyi sağlıyor.
 *
 * Durum render sırasında DEĞİL useEffect içinde okunuyor: sunucu
 * ziyaretçinin seçimini bilemez, ilk çizimde okunsaydı sunucu ile tarayıcı
 * farklı HTML üretir ve React uyarı verirdi.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle(): void {
    const next = !dark;
    const choice: ThemeChoice = next ? "koyu" : "acik";
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    } catch {
      // Gizli pencere vb.: seçim bu sayfada geçerli, saklanamıyor.
    }
    setDark(next);
  }

  const label = dark ? "Gündüz moduna geç" : "Gece moduna geç";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      // İlk çizimde durum bilinmiyor: boyut sabit, simge sonra geliyor —
      // düğme yer değiştirmesin.
      className="flex size-[2.125rem] items-center justify-center rounded-brand border border-tfs-dark-80 text-tfs-grey transition-colors hover:border-tfs-red hover:text-white"
    >
      {dark === null ? null : dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-[1.125rem]"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-[1.125rem]"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}
