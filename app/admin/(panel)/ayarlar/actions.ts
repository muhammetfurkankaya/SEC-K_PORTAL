"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, startSession, verifyPassword, hashPassword } from "@/lib/auth";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/password";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { logAction } from "@/lib/db/queries/audit";
import { resetSettings, setSettings } from "@/lib/db/queries/settings";
import { SETTING_KEYS, isFormKey, type SettingKey } from "@/lib/settings-schema";
import { buildSettingsSchema } from "@/lib/settings-validate";
import { getUserById, updatePassword } from "@/lib/db/queries/users";

/**
 * Ayarları kaydeder.
 *
 * Alan listesi, doğrulama kuralları ve dönüşümler lib/settings-schema.ts'teki
 * kayıttan üretiliyor; burada anahtar adı geçmiyor. Yeni bir ayar eklemek
 * bu dosyada değişiklik gerektirmez.
 */
export async function saveSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  // Form hangi alanları gönderdiğini kendisi bildirir. Gönderilmeyen bir
  // onay kutusu "işaretlenmemiş" ile "o sekme hiç çizilmedi" arasında ayırt
  // edilemezdi; bu işaret olmadan görünmeyen ayarlar sessizce kapanırdı.
  const declared = String(formData.get("__alanlar") ?? "")
    .split(",")
    .filter(isFormKey);
  // Gizli anahtarlar (ör. hero görselinin yolu) formdan ASLA yazılmaz: onları
  // yalnızca kendi eylemleri yazar. Bildirilmiş olsalar bile burada elenir.
  const keys: SettingKey[] = declared.length > 0 ? declared : SETTING_KEYS.filter(isFormKey);

  const input: Record<string, string> = {};
  for (const key of keys) input[key] = String(formData.get(key) ?? "");

  const parsed = buildSettingsSchema(keys).safeParse(input);
  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  setSettings(parsed.data as Partial<Record<SettingKey, string>>);

  logAction(user, "ayarlar.guncelle");

  // Ayarlar üst bant, alt bilgi, ana sayfa ve bülten sayfalarını etkiler.
  revalidatePath("/", "layout");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/admin/kategoriler");

  return succeed("Ayarlar kaydedildi. Portalı yenileyerek görebilirsiniz.");
}

/** Tüm portal ayarlarını varsayılana döndürür (şifreye dokunmaz). */
export async function resetSettingsAction(): Promise<ActionState> {
  const user = await requireUser();

  resetSettings();
  logAction(user, "ayarlar.sifirla");

  revalidatePath("/", "layout");
  revalidatePath("/admin/ayarlar");

  return succeed("Ayarlar varsayılan değerlere döndürüldü.");
}

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Mevcut şifrenizi girin."),
    next: z
      .string()
      .min(8, "Yeni şifre en az 8 karakter olmalı.")
      .max(200)
      // Kurulum varsayılanı bu depoda ve kurulum belgelerinde yazılı; yeni
      // şifre olarak seçilmesi hesabı herkese açık bırakır.
      .refine((value) => value !== DEFAULT_ADMIN_PASSWORD, {
        message: "Kurulumla gelen varsayılan şifre kullanılamaz; farklı bir şifre seçin.",
      }),
    repeat: z.string().min(1, "Yeni şifreyi tekrar girin."),
  })
  .refine((data) => data.next === data.repeat, {
    path: ["repeat"],
    message: "Yeni şifreler birbiriyle eşleşmiyor.",
  });

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const parsed = PasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    repeat: formData.get("repeat"),
  });

  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  const user = getUserById(session.id);
  if (!user) return fail("Kullanıcı bulunamadı.");

  if (!verifyPassword(parsed.data.current, user.password_hash)) {
    return fail("Mevcut şifreniz hatalı.", { current: "Mevcut şifre hatalı." });
  }

  updatePassword(user.id, hashPassword(parsed.data.next));
  logAction(session, "sifre.degistir");

  // Oturum cookie'leri şifre karmasına bağlı: şifre değişince bu hesapla
  // açılmış tüm oturumlar (varsa başka tarayıcılar, başka kişiler) düşer.
  // Kendi oturumumuzu yeni damgayla tazeliyoruz ki panelde kalabilelim.
  await startSession(session);

  return succeed("Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.");
}
