"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { UploadError, deletePdf, saveCover, savePdf } from "@/lib/uploads";
import { logAction } from "@/lib/db/queries/audit";
import { getCategoryById } from "@/lib/db/queries/categories";
import {
  bulletinNoExists,
  createBulletin,
  deleteBulletin,
  getBulletin,
  replaceBulletinFile,
  updateBulletinMeta,
} from "@/lib/db/queries/bulletins";

const MetaSchema = z.object({
  category_id: z.coerce.number().int().positive("Bir sekme seçin."),
  bulletin_no: z.string().trim().min(1, "Bülten numarası zorunludur.").max(60),
  subject: z.string().trim().min(1, "Konu zorunludur.").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  published_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Yayım tarihini gün/ay/yıl olarak seçin."),
  is_published: z.coerce.boolean().optional(),
});

/**
 * Formla gelen kapak görselini (PDF'in tarayıcıda çizilmiş ilk sayfası)
 * kaydeder. Kapak isteğe bağlı: üretilemediyse ya da hatalıysa bülten yine
 * kaydedilir, kartta tipografik kapak görünür.
 */
async function saveCoverFromForm(formData: FormData, pdfPath: string): Promise<void> {
  const cover = formData.get("kapak");
  if (!(cover instanceof File) || cover.size === 0) return;
  try {
    await saveCover(pdfPath, cover);
  } catch (error) {
    if (!(error instanceof UploadError)) throw error;
  }
}

/** Portalın bültenle ilgili sayfalarını tazeler. */
function revalidateBulletinPages(categorySlug?: string): void {
  revalidatePath("/");
  revalidatePath("/admin/bultenler");
  revalidatePath("/admin");
  if (categorySlug) revalidatePath(`/bultenler/${categorySlug}`);
}

export async function createBulletinAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = MetaSchema.safeParse({
    category_id: formData.get("category_id"),
    bulletin_no: formData.get("bulletin_no"),
    subject: formData.get("subject"),
    description: formData.get("description") ?? "",
    published_date: formData.get("published_date"),
    is_published: formData.get("is_published") === "on",
  });

  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  const category = getCategoryById(parsed.data.category_id);
  if (!category) return fail("Seçilen sekme bulunamadı.");

  if (bulletinNoExists(category.id, parsed.data.bulletin_no)) {
    return fail("Bu sekmede aynı numaralı bir bülten zaten var.", {
      bulletin_no: "Bu numara kullanılıyor.",
    });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("PDF dosyası seçmelisiniz.", { file: "PDF dosyası seçin." });
  }

  let saved;
  try {
    saved = await savePdf(file, category.slug);
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message, { file: error.message });
    throw error;
  }

  let bulletinId: number;
  try {
    bulletinId = createBulletin({
      category_id: category.id,
      bulletin_no: parsed.data.bulletin_no,
      subject: parsed.data.subject,
      description: parsed.data.description || null,
      published_date: parsed.data.published_date,
      file_name: saved.file_name,
      file_path: saved.file_path,
      file_size: saved.file_size,
      is_published: parsed.data.is_published ?? true,
    });
  } catch (error) {
    // Kayıt açılamadıysa diskte yetim dosya bırakmayalım.
    await deletePdf(saved.file_path);
    throw error;
  }

  await saveCoverFromForm(formData, saved.file_path);

  logAction(user, "bulten.olustur", {
    entity: "bulletin",
    entityId: bulletinId,
    detail: `${parsed.data.bulletin_no} — ${parsed.data.subject}`,
  });

  revalidateBulletinPages(category.slug);
  redirect("/admin/bultenler?durum=eklendi");
}

export async function updateBulletinAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const existing = getBulletin(id);
  if (!existing) return fail("Bülten bulunamadı.");

  const parsed = MetaSchema.safeParse({
    category_id: formData.get("category_id"),
    bulletin_no: formData.get("bulletin_no"),
    subject: formData.get("subject"),
    description: formData.get("description") ?? "",
    published_date: formData.get("published_date"),
    is_published: formData.get("is_published") === "on",
  });

  if (!parsed.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(parsed.error));
  }

  const category = getCategoryById(parsed.data.category_id);
  if (!category) return fail("Seçilen sekme bulunamadı.");

  if (bulletinNoExists(category.id, parsed.data.bulletin_no, id)) {
    return fail("Bu sekmede aynı numaralı başka bir bülten var.", {
      bulletin_no: "Bu numara kullanılıyor.",
    });
  }

  updateBulletinMeta(id, {
    category_id: category.id,
    bulletin_no: parsed.data.bulletin_no,
    subject: parsed.data.subject,
    description: parsed.data.description || null,
    published_date: parsed.data.published_date,
    is_published: parsed.data.is_published ?? false,
  });

  // Yeni bir dosya seçilmişse eskisini değiştir.
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    let saved;
    try {
      saved = await savePdf(file, category.slug);
    } catch (error) {
      if (error instanceof UploadError) return fail(error.message, { file: error.message });
      throw error;
    }
    const oldPath = existing.file_path;
    replaceBulletinFile(id, saved);
    await deletePdf(oldPath);
    await saveCoverFromForm(formData, saved.file_path);
  }

  logAction(user, "bulten.guncelle", {
    entity: "bulletin",
    entityId: id,
    detail: `${parsed.data.bulletin_no} — ${parsed.data.subject}`,
  });

  revalidateBulletinPages(category.slug);
  // Bülten başka bir sekmeye taşınmış olabilir; eski sekmeyi de tazele.
  revalidatePath(`/bultenler/${existing.category_slug}`);

  return succeed("Bülten güncellendi.");
}

export async function deleteBulletinAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const existing = getBulletin(id);
  if (!existing) redirect("/admin/bultenler?durum=bulunamadi");

  deleteBulletin(id);
  await deletePdf(existing.file_path);

  logAction(user, "bulten.sil", {
    entity: "bulletin",
    entityId: id,
    detail: `${existing.bulletin_no} — ${existing.subject}`,
  });

  revalidateBulletinPages(existing.category_slug);
  redirect("/admin/bultenler?durum=silindi");
}

/** Bülteni yayına alır veya yayından kaldırır. */
export async function togglePublishAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const existing = getBulletin(id);
  if (!existing) redirect("/admin/bultenler?durum=bulunamadi");

  const next = existing.is_published ? false : true;
  updateBulletinMeta(id, {
    category_id: existing.category_id,
    bulletin_no: existing.bulletin_no,
    subject: existing.subject,
    description: existing.description,
    published_date: existing.published_date,
    is_published: next,
  });

  logAction(user, next ? "bulten.yayinla" : "bulten.yayindan-kaldir", {
    entity: "bulletin",
    entityId: id,
    detail: existing.bulletin_no,
  });

  revalidateBulletinPages(existing.category_slug);
  redirect(`/admin/bultenler?durum=${next ? "yayinlandi" : "kaldirildi"}`);
}

/**
 * Mevcut bir bültenin kapak görselini kaydeder — "Kapakları oluştur" düğmesi
 * eksik kapakları tarayıcıda üretip tek tek buraya gönderir.
 */
export async function saveCoverAction(formData: FormData): Promise<ActionState> {
  await requireUser();

  const existing = getBulletin(Number(formData.get("id")));
  if (!existing) return fail("Bülten bulunamadı.");

  const cover = formData.get("kapak");
  if (!(cover instanceof File)) return fail("Kapak görseli gelmedi.");

  try {
    await saveCover(existing.file_path, cover);
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message);
    throw error;
  }

  revalidateBulletinPages(existing.category_slug);
  return succeed("Kapak kaydedildi.");
}
