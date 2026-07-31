"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/format";
import { logAction } from "@/lib/db/queries/audit";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryBySlug,
  listAllCategories,
  moveCategory,
  updateCategory,
} from "@/lib/db/queries/categories";

const NameSchema = z.object({
  name: z.string().trim().min(2, "Sekme adı en az 2 karakter olmalı.").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

function revalidateAll(): void {
  // Sekmeler tüm sayfaların üst navigasyonunda görünür.
  revalidatePath("/", "layout");
  revalidatePath("/admin/kategoriler");
}

export async function createCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return fail("Lütfen sekme adını kontrol edin.", zodFieldErrors(parsed.error));
  }

  // Slug adı Türkçe karakterlerden üretilir; çakışırsa sonuna sayı eklenir.
  const base = slugify(parsed.data.name) || "sekme";
  let slug = base;
  let suffix = 2;
  while (getCategoryBySlug(slug) || listAllCategories().some((c) => c.slug === slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const id = createCategory({
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });

  logAction(user, "sekme.olustur", { entity: "category", entityId: id, detail: parsed.data.name });
  revalidateAll();

  return succeed(`"${parsed.data.name}" sekmesi eklendi.`);
}

export async function updateCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const existing = getCategoryById(id);
  if (!existing) return fail("Sekme bulunamadı.");

  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return fail("Lütfen sekme adını kontrol edin.", zodFieldErrors(parsed.error));
  }

  updateCategory(id, {
    name: parsed.data.name,
    description: parsed.data.description || null,
    is_active: formData.get("is_active") === "on",
  });

  logAction(user, "sekme.guncelle", { entity: "category", entityId: id, detail: parsed.data.name });
  revalidateAll();

  return succeed("Sekme güncellendi.");
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  const direction = formData.get("direction") === "up" ? "up" : "down";

  moveCategory(id, direction);
  revalidateAll();
  redirect("/admin/kategoriler");
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const existing = getCategoryById(id);
  if (!existing) redirect("/admin/kategoriler?durum=bulunamadi");

  const result = deleteCategory(id);
  if (!result.deleted) {
    revalidateAll();
    redirect("/admin/kategoriler?durum=dolu");
  }

  logAction(user, "sekme.sil", { entity: "category", entityId: id, detail: existing.name });
  revalidateAll();
  redirect("/admin/kategoriler?durum=silindi");
}
