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

function findFile(baseNames: string[]): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  for (const base of baseNames) {
    for (const ext of EXTENSIONS) {
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
