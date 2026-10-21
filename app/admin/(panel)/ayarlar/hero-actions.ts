"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fail, succeed, type ActionState } from "@/lib/action-state";
import { logAction } from "@/lib/db/queries/audit";
import { getRawSettings, setSettings } from "@/lib/db/queries/settings";
import { safeBlur } from "@/lib/hero";
import { UploadError, deleteHeroImage, saveHeroImage } from "@/lib/uploads";

/**
 * Ana sayfa hero görselinin yüklenmesi ve kaldırılması.
 *
 * Bu eylemler büyük ayar formundan AYRI: görsel seçilince tarayıcıda
 * küçültülüp doğrudan buraya gönderiliyor ve hemen yayına giriyor. Yazdıkları
 * anahtarlar (`home_hero_path`, `_blur`, `_brightness`) kayıtta "hidden"
 * işaretli; "Ayarları kaydet" onlara hiç dokunmuyor, dolayısıyla biri
 * yüklenen görseli yanlışlıkla ezemiyor.
 */

function revalidate(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/ayarlar");
}

export async function uploadHeroAction(formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const file = formData.get("gorsel");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Bir görsel seçin.");
  }

  // Tarayıcıda hesaplanan değerler — biçimleri sıkı doğrulanıyor; geçersizse
  // görsel yine yüklenir, yalnızca ön izleme/parlaklık kullanılmaz.
  const blur = safeBlur(String(formData.get("blur") ?? "")) ?? "";
  const brightnessRaw = Number(formData.get("parlaklik"));
  const brightness = Number.isFinite(brightnessRaw)
    ? Math.min(Math.max(Math.round(brightnessRaw), 0), 255)
    : 0;

  const previous = getRawSettings().home_hero_path;

  let saved;
  try {
    saved = await saveHeroImage(file, previous);
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message);
    throw error;
  }

  setSettings({
    home_hero_path: saved.path,
    home_hero_blur: blur,
    home_hero_brightness: String(brightness),
    // Görsel yükleyen kişi onu görmek istiyor: gradyana alınmışsa geri aç.
    home_hero_style: "fotograf",
  });

  logAction(user, "ayarlar.hero_yukle", {
    detail: `${saved.path} (${Math.round(saved.size / 1024)} KB)`,
  });
  revalidate();
  return succeed("Görsel yüklendi ve ana sayfada yayında.");
}

export async function removeHeroAction(): Promise<ActionState> {
  const user = await requireUser();

  const previous = getRawSettings().home_hero_path;
  if (previous) await deleteHeroImage(previous);

  setSettings({ home_hero_path: "", home_hero_blur: "", home_hero_brightness: "0" });

  logAction(user, "ayarlar.hero_kaldir");
  revalidate();
  return succeed("Yüklenen görsel kaldırıldı; ana sayfa paketle gelen görsele döndü.");
}
