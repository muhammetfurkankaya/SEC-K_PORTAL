"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { logAction } from "@/lib/db/queries/audit";
import { setSettings } from "@/lib/db/queries/settings";
import { getUserById, updatePassword } from "@/lib/db/queries/users";

/** http/https dışındaki şemaları (ör. javascript:) reddeder. */
const httpUrl = z
  .string()
  .trim()
  .url("Geçerli bir adres girin (https:// ile başlamalı).")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Adres http:// veya https:// ile başlamalı.",
  });

const SettingsSchema = z.object({
  portal_title: z.string().trim().min(2, "Portal adı zorunludur.").max(80),
  portal_subtitle: z.string().trim().max(120).optional().or(z.literal("")),
  qdms_suggestion_url: httpUrl,
  qdms_incident_url: httpUrl,
  announcement: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function saveSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = SettingsSchema.safeParse({
    portal_title: formData.get("portal_title"),
    portal_subtitle: formData.get("portal_subtitle") ?? "",
    qdms_suggestion_url: formData.get("qdms_suggestion_url"),
    qdms_incident_url: formData.get("qdms_incident_url"),
    announcement: formData.get("announcement") ?? "",
  });

  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  setSettings({
    portal_title: parsed.data.portal_title,
    portal_subtitle: parsed.data.portal_subtitle ?? "",
    qdms_suggestion_url: parsed.data.qdms_suggestion_url,
    qdms_incident_url: parsed.data.qdms_incident_url,
    announcement: parsed.data.announcement ?? "",
  });

  logAction(user, "ayarlar.guncelle");

  // Ayarlar üst bant ve ana sayfada görünür.
  revalidatePath("/", "layout");
  revalidatePath("/admin/ayarlar");

  return succeed("Ayarlar kaydedildi.");
}

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Mevcut şifrenizi girin."),
    next: z.string().min(8, "Yeni şifre en az 8 karakter olmalı.").max(200),
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

  return succeed("Şifreniz güncellendi.");
}
