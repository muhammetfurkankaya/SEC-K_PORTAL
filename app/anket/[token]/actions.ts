"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashIp } from "@/lib/auth";
import { fail, type ActionState } from "@/lib/action-state";
import { checkRateLimit } from "@/lib/rate-limit";
import { AVAILABILITY_MESSAGES, checkAvailability } from "@/lib/survey-window";
import {
  getQuestions,
  getSurveyByToken,
  hasRecentResponseFrom,
  saveResponse,
} from "@/lib/db/queries/surveys";
import type { Question } from "@/lib/types";

type Answer = {
  question_id: number;
  option_index?: number | null;
  value_text?: string | null;
  value_number?: number | null;
};

/** Bir sorunun cevaplarını form verisinden çıkarır ve doğrular. */
function readAnswer(
  question: Question,
  formData: FormData,
): { answers: Answer[]; error?: string } {
  const label = question.text.slice(0, 60);

  switch (question.type) {
    case "multi_choice": {
      // Çok seçimli sorularda her seçenek ayrı bir checkbox alanıdır.
      const answers: Answer[] = [];
      question.options.forEach((_, index) => {
        if (formData.get(`q_${question.id}_${index}`) !== null) {
          answers.push({ question_id: question.id, option_index: index });
        }
      });
      if (question.is_required && answers.length === 0) {
        return { answers: [], error: `"${label}" sorusunda en az bir seçenek işaretleyin.` };
      }
      return { answers };
    }

    case "single_choice":
    case "yes_no": {
      const raw = formData.get(`q_${question.id}`);
      if (raw === null || raw === "") {
        if (question.is_required) return { answers: [], error: `"${label}" sorusunu yanıtlayın.` };
        return { answers: [] };
      }
      const index = Number(raw);
      const optionCount = question.type === "yes_no" ? 2 : question.options.length;
      if (!Number.isInteger(index) || index < 0 || index >= optionCount) {
        return { answers: [], error: `"${label}" sorusunda geçersiz seçenek.` };
      }
      return { answers: [{ question_id: question.id, option_index: index }] };
    }

    case "rating":
    case "nps": {
      const raw = formData.get(`q_${question.id}`);
      if (raw === null || raw === "") {
        if (question.is_required) return { answers: [], error: `"${label}" sorusunu puanlayın.` };
        return { answers: [] };
      }
      const value = Number(raw);
      const min = question.scale_min ?? (question.type === "nps" ? 0 : 1);
      const max = question.scale_max ?? (question.type === "nps" ? 10 : 5);
      if (!Number.isInteger(value) || value < min || value > max) {
        return { answers: [], error: `"${label}" sorusunda puan ${min}–${max} arası olmalı.` };
      }
      return { answers: [{ question_id: question.id, value_number: value }] };
    }

    case "number": {
      const raw = String(formData.get(`q_${question.id}`) ?? "").trim();
      if (raw === "") {
        if (question.is_required) return { answers: [], error: `"${label}" sorusunu yanıtlayın.` };
        return { answers: [] };
      }
      // Türkçe klavyede ondalık ayırıcı virgül olabilir.
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value)) {
        return { answers: [], error: `"${label}" sorusuna sayı girin.` };
      }
      return { answers: [{ question_id: question.id, value_number: value }] };
    }

    case "text": {
      const raw = String(formData.get(`q_${question.id}`) ?? "").trim();
      if (raw === "") {
        if (question.is_required) return { answers: [], error: `"${label}" sorusunu yanıtlayın.` };
        return { answers: [] };
      }
      return { answers: [{ question_id: question.id, value_text: raw.slice(0, 4000) }] };
    }

    default:
      return { answers: [] };
  }
}

async function clientIp(): Promise<string | null> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return store.get("x-real-ip");
}

export async function submitSurveyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const survey = getSurveyByToken(token);
  if (!survey) return fail("Anket bulunamadı.");

  // Form açıkken anket kapanmış olabilir — gönderimde tekrar kontrol et.
  const availability = checkAvailability(survey);
  if (!availability.open) return fail(AVAILABILITY_MESSAGES[availability.reason]);

  const ipHash = hashIp(await clientIp());

  // Kötüye kullanımı sınırla: aynı adresten 10 dakikada en fazla 15 gönderim.
  if (ipHash) {
    const limit = checkRateLimit(`anket:${survey.id}:${ipHash}`, 15, 10 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Çok fazla gönderim yapıldı. Lütfen bir süre sonra tekrar deneyin.");
    }
  }

  // Tek kez doldurulabilen anketlerde aynı cihazdan tekrarı engelle.
  if (!survey.allow_multiple && ipHash && hasRecentResponseFrom(survey.id, ipHash)) {
    return fail("Bu anketi zaten doldurmuşsunuz. Katılımınız için teşekkür ederiz.");
  }

  const questions = getQuestions(survey.id);
  if (questions.length === 0) return fail("Bu ankette henüz soru yok.");

  const answers: Answer[] = [];
  for (const question of questions) {
    const result = readAnswer(question, formData);
    if (result.error) return fail(result.error);
    answers.push(...result.answers);
  }

  if (answers.length === 0) {
    return fail("Göndermeden önce en az bir soruyu yanıtlayın.");
  }

  // Sayfanın açıldığı andan gönderime kadar geçen süre (analizde gösterilir).
  const startedAt = Number(formData.get("started_at"));
  const duration =
    Number.isFinite(startedAt) && startedAt > 0
      ? Math.min(Math.round((Date.now() - startedAt) / 1000), 24 * 60 * 60)
      : null;

  const name = survey.collect_identity
    ? String(formData.get("respondent_name") ?? "").trim().slice(0, 120)
    : "";
  const department = survey.collect_identity
    ? String(formData.get("department") ?? "").trim().slice(0, 120)
    : "";

  saveResponse({
    survey_id: survey.id,
    duration_seconds: duration,
    ip_hash: ipHash,
    respondent_name: name || null,
    department: department || null,
    answers,
  });

  redirect(`/anket/${token}/tesekkurler`);
}
