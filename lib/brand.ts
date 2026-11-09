import fs from "node:fs";
import path from "node:path";

/**
 * Kurumsal logo dosyasını arar.
 *
 * Marka Kimlik Kılavuzu'ndaki logonun orijinal vektör dosyası bu depoda yer
 * almıyor. Dosya `public/brand/` altına konulduğunda otomatik olarak
 * kullanılır; bulunamazsa kılavuzun tipografi ve renk kurallarına uygun
 * yazı tabanlı bir kilit (lockup) gösterilir.
 *
 * Beklenen dosya adları:
 *   public/brand/logo.svg        → açık zeminler için (koyu logo)
 *   public/brand/logo-beyaz.svg  → koyu zeminler için (beyaz/dişi logo)
 * .png ve .webp uzantıları da kabul edilir.
 */
const EXTENSIONS = [".svg", ".png", ".webp"];

/** Fotoğraflarda JPEG de kabul edilir; logolarda bilinçli olarak edilmez. */
const PHOTO_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

function findFile(baseNames: string[], extensions: string[] = EXTENSIONS): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  for (const base of baseNames) {
    for (const ext of extensions) {
      if (fs.existsSync(path.join(dir, base + ext))) {
        return `/brand/${base}${ext}`;
      }
    }
  }
  return null;
}

/**
 * @param variant "light" koyu zemin üzerinde (beyaz logo),
 *                "dark" açık zemin üzerinde (koyu logo) anlamına gelir.
 * @returns Logo dosyasının genel URL'i veya dosya yoksa null.
 */
export function findLogo(variant: "light" | "dark"): string | null {
  // Aranan varyant yoksa diğerine düşmek, tek dosya koyan kullanıcı için
  // portalın logosuz kalmasından iyidir.
  return variant === "light"
    ? findFile(["logo-beyaz", "logo-white", "logo"])
    : findFile(["logo", "logo-koyu", "logo-dark", "logo-beyaz"]);
}

/**
 * Ana sayfa hero fotoğrafı — yalnızca GELİŞTİRİCİ değiştirir, panelden değil.
 *
 * `public/brand/hero-anasayfa.(webp|jpg|jpeg|png)` varsa kullanılır; yoksa
 * hero kurumsal gradyana düşer — eksik dosya boş bir alan bırakmaz.
 * Değiştirmek için dosyayı aynı adla değiştirmek yeterli (public/brand/README.md).
 *
 * Adrese dosyanın değişme zamanı eklenir (`?v=…`): dosya değişince adres de
 * değişir, tarayıcılar önbellekteki eski görseli göstermez. Her istekte
 * yeniden bakılır; sunucuda dosya değiştirildiğinde yeniden başlatma
 * gerekmez (birkaç `stat` çağrısı, maliyeti yok denecek kadar az).
 */
export function homeHeroImage(): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  for (const base of ["hero-anasayfa", "hero"]) {
    for (const ext of PHOTO_EXTENSIONS) {
      try {
        const stat = fs.statSync(path.join(dir, base + ext));
        if (stat.isFile()) return `/brand/${base}${ext}?v=${Math.round(stat.mtimeMs)}`;
      } catch {
        // Bu ad/uzantı yok; sıradakine bak.
      }
    }
  }
  return null;
}
