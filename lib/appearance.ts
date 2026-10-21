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
 * Her yuvanın ayar ekranında nasıl tanıtılacağı.
 *
 * React'tan bağımsız tutuluyor: yeni bir yuva eklendiğinde önizlemesinin
 * unutulmasını test yakalasın diye (tests/appearance.test.ts).
 */
export const TEXT_SLOT_META: Record<TextSlot, { label: string; where: string; onDark: boolean }> = {
  home_title: { label: "Ana sayfa başlığı", where: "Hero — en büyük yazı", onDark: true },
  home_kicker: {
    label: "Ana sayfa üst etiketi",
    where: "Hero — başlığın yanındaki etiket",
    onDark: true,
  },
  home_intro: {
    label: "Ana sayfa giriş metni",
    where: "Hero — başlığın altındaki açıklama",
    onDark: true,
  },
  page_title: {
    label: "Sayfa başlıkları",
    where: "Bülten sekmeleri, arama, anketler",
    onDark: false,
  },
  page_eyebrow: {
    label: "Sayfa üst etiketleri",
    where: "Sayfa başlığının üstündeki küçük yazı",
    onDark: false,
  },
  nav: { label: "Sekmeler", where: "Üstteki gezinme çubuğu", onDark: false },
  section_title: {
    label: "Bölüm başlıkları",
    where: "Son Yayımlananlar, Açık Anket…",
    onDark: false,
  },
};

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
  home_title: "text-ink",
  home_kicker: "text-accent-ink",
  home_intro: "text-ink-soft",
  page_title: "text-ink",
  page_eyebrow: "text-accent-ink",
  nav: "",
  section_title: "text-accent-ink",
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

/**
 * Açık zemin (sayfa) karşılıkları — ANLAMSAL renkler.
 *
 * "Koyu" sabit #1d252d değil `text-ink`: gündüz koyu, gece açık. Aksi halde
 * gece modunda "Koyu" seçimi koyu zemin üstüne koyu yazı üretirdi. Yeşil iki
 * temada da okunuyor, sabit kalıyor.
 */
const COLOR_CLASS: Record<string, string> = {
  otomatik: "",
  koyu: "text-ink",
  orta: "text-ink-soft",
  soluk: "text-ink-faint",
  kirmizi: "text-accent-ink",
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
export function textClassFor(slot: TextSlot, size: string, color: string, onDark = false): string {
  const colorTable = onDark ? COLOR_CLASS_ON_DARK : COLOR_CLASS;
  const defaults = onDark ? SLOT_DEFAULT_COLOR_DARK : SLOT_DEFAULT_COLOR;
  const picked = pick(colorTable, color, "otomatik");

  return [pick(SIZE_CLASS[slot], size, "normal"), picked || defaults[slot]]
    .filter(Boolean)
    .join(" ");
}

/** Ayarlardan okuyan sarmalayıcı — sayfalar bunu kullanır. */
export function textClass(
  settings: TypedSettings,
  slot: TextSlot,
  options: { onDark?: boolean } = {},
): string {
  return textClassFor(
    slot,
    settings[`type_${slot}_size` as keyof TypedSettings] as string,
    settings[`type_${slot}_color` as keyof TypedSettings] as string,
    options.onDark,
  );
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
