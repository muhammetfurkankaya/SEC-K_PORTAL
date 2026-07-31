"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, succeed, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { generateToken } from "@/lib/token";
import { logAction } from "@/lib/db/queries/audit";
import { CHOICE_TYPES, QUESTION_TYPES } from "@/lib/types";
import {
  createSurvey,
  deleteSurvey,
  getQuestions,
  getSurvey,
  hasResponses,
  replaceQuestions,
  setSurveyActive,
  updateSurveyMeta,
  type QuestionInput,
} from "@/lib/db/queries/surveys";

const MetaSchema = z.object({
  title: z.string().trim().min(3, "Anket başlığı en az 3 karakter olmalı.").max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  collect_identity: z.boolean(),
  allow_multiple: z.boolean(),
  opens_at: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Geçersiz tarih.").optional(),
  closes_at: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Geçersiz tarih.").optional(),
});

/** Soru editöründen JSON olarak gelen soru listesinin şeması. */
const QuestionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES),
    text: z.string().trim().min(1, "Soru metni boş olamaz.").max(500),
    help_text: z.string().trim().max(300).optional().or(z.literal("")),
    is_required: z.boolean(),
    options: z.array(z.string().trim().max(200)).default([]),
  })
  .superRefine((question, ctx) => {
    // Seçimli sorularda en az iki anlamlı seçenek olmalı.
    if (CHOICE_TYPES.includes(question.type)) {
      const filled = question.options.filter((option) => option.length > 0);
      if (filled.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${question.text.slice(0, 40)}" sorusu için en az 2 seçenek girin.`,
        });
      }
    }
  });

const QuestionsSchema = z
  .array(QuestionSchema)
  .min(1, "Ankete en az bir soru ekleyin.")
  .max(50, "Bir ankete en fazla 50 soru eklenebilir.");

function parseMeta(formData: FormData) {
  return MetaSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    collect_identity: formData.get("collect_identity") === "on",
    allow_multiple: formData.get("allow_multiple") === "on",
    opens_at: formData.get("opens_at") ?? "",
    closes_at: formData.get("closes_at") ?? "",
  });
}

/** Soru tipine göre ölçek sınırlarını belirler. */
function scaleFor(type: QuestionInput["type"]): { min: number | null; max: number | null } {
  if (type === "rating") return { min: 1, max: 5 };
  if (type === "nps") return { min: 0, max: 10 };
  return { min: null, max: null };
}

function toQuestionInputs(parsed: z.infer<typeof QuestionsSchema>): QuestionInput[] {
  return parsed.map((question) => {
    const scale = scaleFor(question.type);
    return {
      type: question.type,
      text: question.text,
      help_text: question.help_text || null,
      is_required: question.is_required,
      // Seçenek listesi yalnızca seçimli tiplerde saklanır.
      options: CHOICE_TYPES.includes(question.type)
        ? question.options.filter((option) => option.length > 0)
        : [],
      scale_min: scale.min,
      scale_max: scale.max,
    };
  });
}

function revalidateSurveyPages(id?: number): void {
  revalidatePath("/", "layout");
  revalidatePath("/anketler");
  revalidatePath("/admin/anketler");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/anketler/${id}`);
}

export async function createSurveyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const meta = parseMeta(formData);
  if (!meta.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(meta.error));
  }

  const id = createSurvey({
    public_token: generateToken(),
    title: meta.data.title,
    description: meta.data.description || null,
    collect_identity: meta.data.collect_identity,
    allow_multiple: meta.data.allow_multiple,
    opens_at: meta.data.opens_at || null,
    closes_at: meta.data.closes_at || null,
  });

  logAction(user, "anket.olustur", { entity: "survey", entityId: id, detail: meta.data.title });
  revalidateSurveyPages(id);

  // Soruları eklemek için doğrudan düzenleme ekranına geç.
  redirect(`/admin/anketler/${id}?durum=olusturuldu`);
}

export async function saveSurveyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const survey = getSurvey(id);
  if (!survey) return fail("Anket bulunamadı.");

  const meta = parseMeta(formData);
  if (!meta.success) {
    return fail("Lütfen işaretli alanları düzeltin.", zodFieldErrors(meta.error));
  }

  updateSurveyMeta(id, {
    title: meta.data.title,
    description: meta.data.description || null,
    collect_identity: meta.data.collect_identity,
    allow_multiple: meta.data.allow_multiple,
    opens_at: meta.data.opens_at || null,
    closes_at: meta.data.closes_at || null,
  });

  // Soru listesi yalnızca henüz cevap gelmemiş anketlerde değiştirilebilir:
  // aksi halde şemadaki ON DELETE CASCADE mevcut cevapları silerdi.
  const questionsRaw = formData.get("questions");
  if (typeof questionsRaw === "string" && questionsRaw.length > 0) {
    if (hasResponses(id)) {
      revalidateSurveyPages(id);
      return fail(
        "Ankete cevap geldiği için soruları değiştirilemez. Anket bilgileri kaydedildi. " +
          "Soruları değiştirmek için anketi kopyalayın.",
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(questionsRaw);
    } catch {
      return fail("Soru listesi okunamadı. Sayfayı yenileyip tekrar deneyin.");
    }

    const questions = QuestionsSchema.safeParse(json);
    if (!questions.success) {
      return fail(questions.error.issues[0]?.message ?? "Soruları kontrol edin.");
    }

    replaceQuestions(id, toQuestionInputs(questions.data));
  }

  logAction(user, "anket.guncelle", { entity: "survey", entityId: id, detail: meta.data.title });
  revalidateSurveyPages(id);

  return succeed("Anket kaydedildi.");
}

export async function toggleSurveyActiveAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const survey = getSurvey(id);
  if (!survey) redirect("/admin/anketler?durum=bulunamadi");

  // Sorusu olmayan bir anket yayınlanmamalı.
  if (!survey.is_active && survey.question_count === 0) {
    redirect(`/admin/anketler/${id}?durum=sorusuz`);
  }

  const next = !survey.is_active;
  setSurveyActive(id, next);

  logAction(user, next ? "anket.yayinla" : "anket.kapat", {
    entity: "survey",
    entityId: id,
    detail: survey.title,
  });

  revalidateSurveyPages(id);
  redirect(`/admin/anketler?durum=${next ? "yayinlandi" : "kapatildi"}`);
}

export async function deleteSurveyAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const survey = getSurvey(id);
  if (!survey) redirect("/admin/anketler?durum=bulunamadi");

  deleteSurvey(id);
  logAction(user, "anket.sil", { entity: "survey", entityId: id, detail: survey.title });

  revalidateSurveyPages();
  redirect("/admin/anketler?durum=silindi");
}

/**
 * Anketi sorularıyla birlikte kopyalar.
 *
 * Cevap alınmış bir anketin soruları değiştirilemediği için, güncellenmiş bir
 * sürüm yayınlamanın yolu kopyasını çıkarmaktır. Kopya cevapsız ve kapalı
 * olarak oluşturulur.
 */
export async function duplicateSurveyAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const survey = getSurvey(id);
  if (!survey) redirect("/admin/anketler?durum=bulunamadi");

  const newId = createSurvey({
    public_token: generateToken(),
    title: `${survey.title} (kopya)`,
    description: survey.description,
    collect_identity: Boolean(survey.collect_identity),
    allow_multiple: Boolean(survey.allow_multiple),
    opens_at: survey.opens_at,
    closes_at: survey.closes_at,
  });

  const questions = getQuestions(id);
  if (questions.length > 0) {
    replaceQuestions(
      newId,
      questions.map((question) => ({
        type: question.type,
        text: question.text,
        help_text: question.help_text,
        is_required: Boolean(question.is_required),
        options: question.options,
        scale_min: question.scale_min,
        scale_max: question.scale_max,
      })),
    );
  }

  logAction(user, "anket.kopyala", { entity: "survey", entityId: newId, detail: survey.title });
  revalidateSurveyPages(newId);
  redirect(`/admin/anketler/${newId}?durum=kopyalandi`);
}
