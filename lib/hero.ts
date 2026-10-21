import { HOME_HERO_IMAGE } from "@/lib/brand";
import type { TypedSettings } from "@/lib/settings-schema";
import { HERO_PATH_PATTERN } from "@/lib/uploads";

/**
 * Ana sayfa hero'sunun hangi görselle, hangi perdeyle çizileceği.
 *
 * Çözümleme sırası tek yerde: yüklenen görsel → paketle gelen görsel →
 * marka gradyanı. Hiçbir durumda boş bir hero kalmaz; "Kaldır" bir üst
 * basamağa döner.
 */
export type ResolvedHero = {
  imageSrc: string | null;
  blurDataUrl: string | null;
  scrim: "normal" | "strong";
  focal: "ust" | "orta" | "alt";
  /** Görsel panelden mi yüklendi (yoksa paketle mi geldi)? */
  uploaded: boolean;
};

/** Parlaklık (0-255) bu değerin üstündeyse "otomatik" perde güçlüye geçer. */
export const BRIGHT_THRESHOLD = 150;

/** Yüklenen hero görselinin genel adresi. */
export function heroImageUrl(relativePath: string): string {
  return `/api/gorsel/${relativePath}`;
}

/**
 * Bulanık ön izleme yalnızca küçük, gömülü bir görsel olabilir.
 *
 * Değer sayfaya satır içi stil olarak basıldığı için biçimi sıkı: başka bir
 * şey (ör. dış adres ya da tırnak kaçışı) asla geçmez.
 */
export function safeBlur(value: string): string | null {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 4096
    ? value
    : null;
}

export function resolveHomeHero(
  settings: TypedSettings,
  bundledImage: string | null = HOME_HERO_IMAGE,
): ResolvedHero {
  const focal = settings.home_hero_focal;
  const uploadedPath = HERO_PATH_PATTERN.test(settings.home_hero_path)
    ? settings.home_hero_path
    : null;

  if (settings.home_hero_style === "gradyan") {
    return { imageSrc: null, blurDataUrl: null, scrim: "normal", focal, uploaded: false };
  }

  const imageSrc = uploadedPath ? heroImageUrl(uploadedPath) : bundledImage;
  const uploaded = Boolean(uploadedPath);

  // "Otomatik": parlaklık yalnızca panelden yüklenen görsel için ölçülüyor.
  // Paketle gelen görsel bilinen bir görsel; normal perdeyle okunuyor.
  let scrim: ResolvedHero["scrim"] = settings.home_hero_scrim === "guclu" ? "strong" : "normal";
  if (settings.home_hero_scrim === "otomatik" && uploaded) {
    scrim = settings.home_hero_brightness > BRIGHT_THRESHOLD ? "strong" : "normal";
  }

  return {
    imageSrc,
    blurDataUrl: uploaded ? safeBlur(settings.home_hero_blur) : null,
    scrim,
    focal,
    uploaded,
  };
}
