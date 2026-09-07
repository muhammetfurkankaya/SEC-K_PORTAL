"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, startSession, verifyPassword, hashPassword } from "@/lib/auth";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/password";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { logAction } from "@/lib/db/queries/audit";
import { resetSettings, setSettings } from "@/lib/db/queries/settings";
import { ANNOUNCEMENT_LEVELS, SORT_KEYS } from "@/lib/settings-schema";
import { getUserById, updatePassword } from "@/lib/db/queries/users";

/** http/https dışındaki şemaları (ör. javascript:) reddeder. */
const httpUrl = z
  .string()
  .trim()
  .url("Geçerli bir adres girin (https:// ile başlamalı).")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Adres http:// veya https:// ile başlamalı.",
  });

const checkbox = z.preprocess((value) => (value === "on" ? "1" : "0"), z.string());

const SettingsSchema = z.object({
  portal_title: z.string().trim().min(2, "Portal adı zorunludur.").max(80),
  portal_subtitle: z.string().trim().max(120).optional().or(z.literal("")),
  home_intro: z.string().trim().max(400).optional().or(z.literal("")),
  footer_note: z.string().trim().max(200).optional().or(z.literal("")),

  qdms_suggestion_url: httpUrl,
  qdms_suggestion_title: z.string().trim().min(2, "Kart başlığı zorunludur.").max(60),
  qdms_suggestion_desc: z.string().trim().max(240).optional().or(z.literal("")),
  qdms_incident_url: httpUrl,
  qdms_incident_title: z.string().trim().min(2, "Kart başlığı zorunludur.").max(60),
  qdms_incident_desc: z.string().trim().max(240).optional().or(z.literal("")),

  announcement: z.string().trim().max(300).optional().or(z.literal("")),
  announcement_level: z.enum(ANNOUNCEMENT_LEVELS),
  announcement_active: checkbox,

  home_recent_count: z.coerce
    .number()
    .int()
    .min(3, "En az 3 olmalı.")
    .max(24, "En fazla 24 olabilir."),
  default_sort: z.enum(SORT_KEYS),
  enable_pdf_preview: checkbox,
  show_download_count: checkbox,
  show_surveys_section: checkbox,
});

export async function saveSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = SettingsSchema.safeParse({
    portal_title: formData.get("portal_title"),
    portal_subtitle: formData.get("portal_subtitle") ?? "",
    home_intro: formData.get("home_intro") ?? "",
    footer_note: formData.get("footer_note") ?? "",

    qdms_suggestion_url: formData.get("qdms_suggestion_url"),
    qdms_suggestion_title: formData.get("qdms_suggestion_title"),
    qdms_suggestion_desc: formData.get("qdms_suggestion_desc") ?? "",
    qdms_incident_url: formData.get("qdms_incident_url"),
    qdms_incident_title: formData.get("qdms_incident_title"),
    qdms_incident_desc: formData.get("qdms_incident_desc") ?? "",

    announcement: formData.get("announcement") ?? "",
    announcement_level: formData.get("announcement_level"),
    announcement_active: formData.get("announcement_active"),

    home_recent_count: formData.get("home_recent_count"),
    default_sort: formData.get("default_sort"),
    enable_pdf_preview: formData.get("enable_pdf_preview"),
    show_download_count: formData.get("show_download_count"),
    show_surveys_section: formData.get("show_surveys_section"),
  });

  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  setSettings({
    portal_title: data.portal_title,
    portal_subtitle: data.portal_subtitle ?? "",
    home_intro: data.home_intro ?? "",
    footer_note: data.footer_note ?? "",

    qdms_suggestion_url: data.qdms_suggestion_url,
    qdms_suggestion_title: data.qdms_suggestion_title,
    qdms_suggestion_desc: data.qdms_suggestion_desc ?? "",
    qdms_incident_url: data.qdms_incident_url,
    qdms_incident_title: data.qdms_incident_title,
    qdms_incident_desc: data.qdms_incident_desc ?? "",

    announcement: data.announcement ?? "",
    announcement_level: data.announcement_level,
    announcement_active: data.announcement_active,

    home_recent_count: String(data.home_recent_count),
    default_sort: data.default_sort,
    enable_pdf_preview: data.enable_pdf_preview,
    show_download_count: data.show_download_count,
    show_surveys_section: data.show_surveys_section,
  });

  logAction(user, "ayarlar.guncelle");

  // Ayarlar üst bant, alt bilgi, ana sayfa ve bülten sayfalarını etkiler.
  revalidatePath("/", "layout");
  revalidatePath("/admin/ayarlar");

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
