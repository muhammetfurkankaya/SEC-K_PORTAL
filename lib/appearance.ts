import type { TypedSettings } from "@/lib/settings-schema";

/**
 * Ayarlardaki punto/renk/yerleşim seçimlerinin Tailwind sınıf karşılıkları.
 *
 * NEDEN STATİK TABLO: Tailwind kaynak dosyalarını metin olarak tarar;
 * `text-${size}` gibi çalışma anında birleştirilen bir sınıf adını göremez
 * ve o sınıfı hiç üretmez — sonuç, yalnızca üretimde ortaya çıkan biçimsiz
 * bir yazı olur. Aşağıdaki tablolardaki her sınıf düz metin olarak yazılı,
 * ayrıca globals.css'teki `@source inline(...)` satırı güvenceye alıyor.
 * tests/appearance.test.ts ikisinin eşitliğini doğruluyor.
 *
 * NEDEN ANLAMSAL RENK: renk seçenekleri `text-ink`, `text-ink-soft` gibi
 * anlamsal sınıflara eşleniyor, `text-tfs-dark`'a değil. Gece modu geldiğinde
 * "Koyu" seçen bir yöneticinin siyah üstüne siyah yazı üretmemesi için.
 */

export const TEXT_SLOTS = [
  "home_title",
  "home_kicker",
  "home_intro",
  "page_title",
  "page_eyebrow",
  "nav",
  "section_title",
] as const;

export type TextSlot = (typeof TEXT_SLOTS)[number];

/**
 * Punto kademeleri.
 *
 * Her kademe mobil + masaüstü çifti: "Çok büyük" seçimi telefonda başlığı
 * taşırmasın diye küçük ekranda daha ölçülü bir değerle başlıyor.
 */
const SIZE_CLASS: Record<TextSlot, Record<string, string>> = {
  home_title: {
    kucuk: "text-[1.75rem] sm:text-[2.25rem] lg:text-[2.75rem]",
    normal: "text-[2.25rem] sm:text-[3.25rem] lg:text-[4rem]",
    buyuk: "text-[2.5rem] sm:text-[3.75rem] lg:text-[4.75rem]",
    "cok-buyuk": "text-[2.75rem] sm:text-[4.25rem] lg:text-[5.5rem]",
  },
  home_kicker: {
    kucuk: "text-[0.625rem]",
    normal: "text-[0.6875rem]",
    buyuk: "text-sm",
    "cok-buyuk": "text-base",
  },
  home_intro: {
    kucuk: "text-sm",
    normal: "text-base sm:text-lg",
    buyuk: "text-lg sm:text-xl",
    "cok-buyuk": "text-xl sm:text-2xl",
  },
  page_title: {
    kucuk: "text-[1.375rem] sm:text-[1.75rem]",
    normal: "text-[1.75rem] sm:text-[2.25rem]",
    buyuk: "text-[2rem] sm:text-[2.75rem]",
    "cok-buyuk": "text-[2.25rem] sm:text-[3.25rem]",
  },
  page_eyebrow: {
    kucuk: "text-[0.625rem]",
    normal: "text-[0.6875rem]",
    buyuk: "text-sm",
    "cok-buyuk": "text-base",
  },
  nav: {
    kucuk: "text-xs",
    normal: "text-sm",
    buyuk: "text-base",
    "cok-buyuk": "text-lg",
  },
  section_title: {
    kucuk: "text-[0.625rem]",
    normal: "text-xs",
    buyuk: "text-sm",
    "cok-buyuk": "text-base",
  },
};

/**
 * Her yuvanın "Varsayılan" seçimindeki rengi.
 *
 * Boş bırakılamaz: renk sınıfı hiç üretilmezse yazı, kapsayıcısından rengini
 * miras alır — hero'da bu, fotoğrafın üstünde koyu gri bir başlık demek.
 * Sekmeler (`nav`) bilinçli olarak boş: aktif/pasif renkleri durum bazlı ve
 * buradan gelen bir renk onları ezerdi.
 */
const SLOT_DEFAULT_COLOR: Record<TextSlot, string> = {
  home_title: "text-tfs-dark",
  home_kicker: "text-tfs-red",
  home_intro: "text-tfs-dark-80",
  page_title: "text-tfs-dark",
  page_eyebrow: "text-tfs-red",
  nav: "",
  section_title: "text-tfs-red",
};

/** Koyu zemin (hero) karşılıkları. */
const SLOT_DEFAULT_COLOR_DARK: Record<TextSlot, string> = {
  home_title: "text-white",
  home_kicker: "text-tfs-grey",
  home_intro: "text-white/85",
  page_title: "text-white",
  page_eyebrow: "text-tfs-grey",
  nav: "",
  section_title: "text-tfs-grey",
};

const COLOR_CLASS: Record<string, string> = {
  otomatik: "",
  koyu: "text-tfs-dark",
  orta: "text-tfs-dark-80",
  soluk: "text-tfs-dark-60",
  kirmizi: "text-tfs-red",
  yesil: "text-tfs-green",
};

/**
 * Hero koyu zeminde olduğu için aynı seçim orada başka karşılıklara eşlenir:
 * fotoğrafın üstüne koyu gri yazı okunmaz.
 */
const COLOR_CLASS_ON_DARK: Record<string, string> = {
  otomatik: "",
  koyu: "text-white",
  orta: "text-white/85",
  soluk: "text-tfs-grey",
  kirmizi: "text-[#ff8f94]",
  yesil: "text-tfs-green",
};

const ALIGN_TEXT: Record<string, string> = {
  sol: "text-left",
  orta: "text-center",
  sag: "text-right",
};

/** Blok konumu — kalan boşluk hangi tarafa bırakılsın. */
const ALIGN_BLOCK: Record<string, string> = {
  sol: "mr-auto",
  orta: "mx-auto",
  sag: "ml-auto",
};

const WIDTH_BLOCK: Record<string, string> = {
  dar: "max-w-3xl",
  orta: "max-w-5xl",
  genis: "max-w-6xl",
  tam: "max-w-none",
};

/** Tablolarda olmayan bir değer gelirse varsayılana düş — asla boş sınıf. */
function pick(table: Record<string, string>, value: string, fallback: string): string {
  return table[value] ?? table[fallback] ?? "";
}

/** Bir metin yuvası için punto + renk sınıflarını birleştirir. */
export function textClass(
  settings: TypedSettings,
  slot: TextSlot,
  options: { onDark?: boolean } = {},
): string {
  const size = settings[`type_${slot}_size` as keyof TypedSettings] as string;
  const color = settings[`type_${slot}_color` as keyof TypedSettings] as string;

  const colorTable = options.onDark ? COLOR_CLASS_ON_DARK : COLOR_CLASS;
  const defaults = options.onDark ? SLOT_DEFAULT_COLOR_DARK : SLOT_DEFAULT_COLOR;
  const picked = pick(colorTable, color, "otomatik");

  return [pick(SIZE_CLASS[slot], size, "normal"), picked || defaults[slot]]
    .filter(Boolean)
    .join(" ");
}

export function alignClass(value: string): string {
  return pick(ALIGN_TEXT, value, "sol");
}

export function blockPositionClass(value: string): string {
  return pick(ALIGN_BLOCK, value, "sol");
}

export function blockWidthClass(value: string): string {
  return pick(WIDTH_BLOCK, value, "tam");
}

/** Testlerin safelist ile karşılaştırabilmesi için tüm sınıfların listesi. */
export function allAppearanceClasses(): string[] {
  const out = new Set<string>();
  for (const slot of TEXT_SLOTS) {
    for (const value of Object.values(SIZE_CLASS[slot])) {
      for (const part of value.split(" ")) out.add(part);
    }
  }
  for (const table of [
    COLOR_CLASS,
    COLOR_CLASS_ON_DARK,
    SLOT_DEFAULT_COLOR,
    SLOT_DEFAULT_COLOR_DARK,
    ALIGN_TEXT,
    ALIGN_BLOCK,
    WIDTH_BLOCK,
  ]) {
    for (const value of Object.values(table)) {
      for (const part of value.split(" ")) if (part) out.add(part);
    }
  }
  return [...out].sort();
}
