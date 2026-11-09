import { homeHeroImage } from "@/lib/brand";
import type { TypedSettings } from "@/lib/settings-schema";

/**
 * Ana sayfa hero'sunun hangi görselle, hangi perdeyle çizileceği.
 *
 * Görsel panelden yüklenmez; geliştirici `public/brand/hero-anasayfa.*`
 * dosyasını değiştirir (lib/brand.ts). Sıra: o dosya → marka gradyanı.
 * Hiçbir durumda boş bir hero kalmaz.
 */
export type ResolvedHero = {
  imageSrc: string | null;
  scrim: "normal" | "strong";
  focal: "ust" | "orta" | "alt";
};

export function resolveHomeHero(
  settings: TypedSettings,
  bundledImage: string | null = homeHeroImage(),
): ResolvedHero {
  const focal = settings.home_hero_focal;
  const scrim = settings.home_hero_scrim === "guclu" ? "strong" : "normal";
  if (settings.home_hero_style === "gradyan" || !bundledImage) {
    return { imageSrc: null, scrim: "normal", focal };
  }
  return { imageSrc: bundledImage, scrim, focal };
}
